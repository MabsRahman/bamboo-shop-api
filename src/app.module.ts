import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from './mailer/mailer.module';
import { UserModule } from './user/user.module';
import { AddressModule } from './address/address.module';

@Module({
  imports: [PrismaModule, AuthModule, MailerModule, UserModule, AddressModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
