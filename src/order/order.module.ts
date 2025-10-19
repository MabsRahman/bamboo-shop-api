import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { BkashService } from '../payment/payment-service/bkash.service';
import { NagadService } from '../payment/payment-service/nagad.service';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  controllers: [OrderController],
  providers: [OrderService, PrismaService, BkashService, NagadService],
  imports: [PrismaModule, AuthModule, MailerModule],
})
export class OrderModule {}
