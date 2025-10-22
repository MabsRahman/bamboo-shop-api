import { Module } from '@nestjs/common';
import { CartReminderService } from './cart-reminder.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

@Module({
  providers: [CartReminderService, PrismaService, MailerService],
})
export class CartReminderModule {}
