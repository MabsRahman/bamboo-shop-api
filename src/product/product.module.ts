import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  controllers: [ProductController],
  providers: [ProductService],
  imports: [PrismaModule, AuthModule],
})
export class ProductModule {}
