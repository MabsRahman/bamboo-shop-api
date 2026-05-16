import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { ReturnStatus } from '@prisma/client';

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

  async getAllReturnsForAdmin(status?: string, page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (search) {
      const cleanSearch = search.trim();
      const numericValue = Number(cleanSearch);

      if (!isNaN(numericValue) && cleanSearch !== '') {
        where.OR = [
          { id: numericValue },
          { orderId: numericValue }
        ];
      } else {
        where.user = {
          OR: [
            { name: { contains: cleanSearch } },
            { email: { contains: cleanSearch } }
          ]
        };
      }
    }

    const [returns, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, mobile: true } },
          order: true,
          details: { include: { product: true, images: true } },
        },
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      returns,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async updateReturnStatus(id: number, status: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { details: true, user: true }
    });

    if (!returnRequest) throw new BadRequestException('Return not found');

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: { status: status as ReturnStatus },
    });

    if (status === 'RECEIVED') {
      for (const item of returnRequest.details) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: 1 } },
        });
      }
    }

    await this.mailerService.sendReturnStatusUpdateEmail(
      returnRequest.user.email,
      returnRequest.user.name,
      status,
      id
    );

    return updated;
  }

  async deleteReturn(id: number) {
    return this.prisma.returnRequest.delete({ where: { id } });
  }

}
