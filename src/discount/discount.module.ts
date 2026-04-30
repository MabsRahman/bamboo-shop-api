import { Module } from '@nestjs/common';
import { DiscountController } from './discount.controller';
import { DiscountService } from './discount.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  controllers: [DiscountController],
  providers: [DiscountService, PrismaService],
  imports: [AuthModule]
})
export class DiscountModule {}
