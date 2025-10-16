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
import { RatingService } from './rating/rating.service';
import { RatingController } from './rating/rating.controller';
import { RatingModule } from './rating/rating.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [PrismaModule, AuthModule, MailerModule, UserModule, AddressModule, CategoryModule, ProductModule, DiscountModule, RatingModule, WishlistModule],
  controllers: [AppController, ProductController, RatingController],
  providers: [AppService, ProductService, RatingService],
})
export class AppModule {}
