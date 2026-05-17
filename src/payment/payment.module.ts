import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { BkashService } from './payment-service/bkash.service';
import { NagadService } from './payment-service/nagad.service';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService, BkashService, NagadService],
  imports: [PrismaModule, AuthModule, MailerModule],
})
export class PaymentModule {}
