import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { DiscountService } from 'src/discount/discount.service';
import { MailerModule } from 'src/mailer/mailer.module';
@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService, DiscountService, PrismaService],
  imports: [AuthModule, MailerModule]
})
export class NewsletterModule {}
