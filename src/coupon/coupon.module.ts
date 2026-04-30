import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { CouponService } from './coupon.service';
import { DiscountService } from 'src/discount/discount.service';
import { MailerModule } from 'src/mailer/mailer.module';
import { MarketingCronService } from './marketing-cron.service';
@Module({
  controllers: [CouponController],
  providers: [CouponService, DiscountService, PrismaService, MarketingCronService],
  imports: [AuthModule, MailerModule]
})
export class CouponModule {}
