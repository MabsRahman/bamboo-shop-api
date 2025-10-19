import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

interface ReturnItemDto {
  productId: number;
  reason: string;
  images?: string[];
}

@Injectable()
export class ReturnService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async createReturnRequest(userId: number, orderId: number, items: ReturnItemDto[]) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!order || order.userId !== userId) {
      throw new BadRequestException('Invalid order');
    }

    if (order.status !== 'delivered') {
      throw new BadRequestException('Only delivered orders can be returned');
    }

    const deliveredDate = order.updatedAt;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 15) {
      throw new BadRequestException('Return period has expired');
    }

    const orderProductIds = order.items.map(i => i.productId);
    for (const item of items) {
      if (!orderProductIds.includes(item.productId)) {
        throw new BadRequestException(`Product ${item.productId} is not in this order`);
      }
    }

    const returnRequest = await this.prisma.returnRequest.create({
    data: {
        orderId,
        userId,
        status: 'PENDING',
        details: {
        create: items.map(item => ({
            productId: item.productId,
            reason: item.reason,
            images: {
            create: item.images?.map(url => ({ url })) || [],
            },
        })),
        },
    },
    include: { details: { include: { images: true, product: true } }, order: true, user: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new BadRequestException('User not found');

    await this.mailerService.sendReturnRequestReceivedEmail(
      user.email,
      user.name,
      returnRequest,
    );

    return returnRequest;
  }

  async getUserReturns(userId: number) {
    return this.prisma.returnRequest.findMany({
      where: { userId },
      include: {
        details: { include: { product: true, images: true } },
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
