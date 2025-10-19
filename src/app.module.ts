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
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentService } from './payment/payment.service';
import { PaymentController } from './payment/payment.controller';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [PrismaModule, AuthModule, MailerModule, UserModule, AddressModule, CategoryModule, ProductModule, DiscountModule, RatingModule, WishlistModule, CartModule, OrderModule, PaymentModule],
  controllers: [AppController, ProductController, RatingController, PaymentController],
  providers: [AppService, ProductService, RatingService, PaymentService],
})
export class AppModule {}
