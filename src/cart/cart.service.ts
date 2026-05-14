import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async addToCart(userId: number, dto: CreateCartDto) {
    const { productId, quantity } = dto;

    const existing = await this.prisma.cart.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      return this.prisma.cart.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    }

    return this.prisma.cart.create({
      data: { userId, productId, quantity },
    });
  }

  async getUserCart(userId: number) {
    return this.prisma.cart.findMany({
      where: { userId },
      include: { product: true },
    });
  }

  async updateCartItem(productId: number, userId: number, dto: UpdateCartDto) {
    return this.prisma.cart.updateMany({
      where: { 
        productId: productId,
        userId: userId, 
      },
      data: { 
        quantity: dto.quantity 
      },
    });
  }

  async removeCartItem(productId: number, userId: number) {
    return this.prisma.cart.deleteMany({
      where: {
        productId: productId,
        userId: userId,
      },
    });
  }

  async clearCart(userId: number) {
    return this.prisma.cart.deleteMany({
      where: { userId },
    });
  }
}
