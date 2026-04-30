import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService, private mailerService: MailerService) {}

  async create(dto: CreateCouponDto) {
  const existing = await this.prisma.coupon.findUnique({ 
    where: { code: dto.code } 
  });
  
  if (existing) {
    throw new BadRequestException('Coupon code already exists');
  }

  const { productIds, userIds, message, ...data } = dto;

  const coupon = await this.prisma.coupon.create({
      data: {
        ...data,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        couponProducts: productIds && productIds.length > 0 ? {
          create: productIds.map(id => ({ productId: id }))
        } : undefined,
        couponUsers: userIds && userIds.length > 0 ? {
          create: userIds.map(id => ({ userId: id }))
        } : undefined,
      }
    });

    if (userIds && userIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { email: true, name: true }
      });

      users.forEach(user => {
        this.mailerService.sendCouponGiftEmail(
          user.email,
          user.name,
          coupon.code,
          coupon.value,
          coupon.type,
          message || "We have a special discount code for your next purchase!"
        ).catch(err => {
          console.error(`Failed to send coupon email to ${user.email}:`, err);
        });
      });
    }
    return coupon;
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      include: {
        couponProducts: { include: { product: true } },
        couponUsers: { include: { user: true } }
      }
    });
  }

  async findOne(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        couponProducts: { include: { product: true } },
        couponUsers: { include: { user: true } }
      }
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async validateCoupon(code: string, userId: number, productIds: number[]) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: { couponProducts: true, couponUsers: true }
    });

    if (!coupon) throw new BadRequestException('Invalid coupon code');

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) throw new BadRequestException('Coupon not active yet');
    if (coupon.endsAt && now > coupon.endsAt) throw new BadRequestException('Coupon expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Usage limit reached');

    if (coupon.couponUsers.length > 0) {
      const allowed = coupon.couponUsers.some(cu => cu.userId === userId);
      if (!allowed) throw new BadRequestException('This coupon is not valid for your account');
    }

    if (coupon.couponProducts.length > 0) {
      const allowed = productIds.some(pid => coupon.couponProducts.some(cp => cp.productId === pid));
      if (!allowed) throw new BadRequestException('This coupon does not apply to items in your cart');
    }

    return coupon;
  }

  async remove(id: number) {
    return this.prisma.coupon.delete({ where: { id } });
  }
}