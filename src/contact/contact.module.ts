import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  controllers: [ContactController],
  providers: [ContactService, PrismaService],
  imports: [PrismaModule, AuthModule, MailerModule],
})
export class ContactModule {}
