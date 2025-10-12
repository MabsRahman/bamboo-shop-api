import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from './mailer/mailer.module';
import { UserModule } from './user/user.module';
import { AddressModule } from './address/address.module';
import { CategoryModule } from './category/category.module';
import { ProductService } from './product/product.service';
import { ProductController } from './product/product.controller';
import { ProductModule } from './product/product.module';
import { DiscountModule } from './discount/discount.module';

@Module({
  imports: [PrismaModule, AuthModule, MailerModule, UserModule, AddressModule, CategoryModule, ProductModule, DiscountModule],
  controllers: [AppController, ProductController],
  providers: [AppService, ProductService],
})
export class AppModule {}
