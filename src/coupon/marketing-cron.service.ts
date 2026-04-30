import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CouponService } from './coupon.service';

@Injectable()
export class MarketingCronService {
  private readonly logger = new Logger(MarketingCronService.name);

  constructor(
    private prisma: PrismaService,
    private couponService: CouponService,
  ) {}

  @Cron('0 8 * * *') 
  async handleNewCustomerCoupons() {
    this.logger.log('Checking for new customers to send welcome coupons...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUsers = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
        orders: { none: {} } 
      }
    });

    for (const user of newUsers) {
      try {
        const uniqueCode = `WELCOME-${user.name.split(' ')[0].toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await this.couponService.create({
            code: uniqueCode,
            type: 'percentage',
            value: 10,
            userIds: [user.id],
            message: "Welcome to the Bamboo Shop family! Since you just joined us, we want to give you a special 10% discount on your first order.",
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        this.logger.log(`Welcome coupon sent to ${user.email}`);
      } catch (error) {
        this.logger.error(`Failed to create welcome coupon for ${user.email}: ${error.message}`);
      }
    }
  }
}