import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async addToWishlist(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
    const existing = await this.prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      throw new HttpException('Already in wishlist', HttpStatus.CONFLICT);
    }

    return this.prisma.wishlist.create({
      data: { userId, productId },
    });
  }

  async getUserWishlist(userId: number) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeFromWishlist(userId: number, productId: number) {
    const existing = await this.prisma.wishlist.findFirst({
      where: { userId, productId },
    });

    if (!existing) {
      throw new HttpException('Item not found in wishlist', HttpStatus.NOT_FOUND);
    }

    return this.prisma.wishlist.delete({
      where: { id: existing.id },
    });
  }
  
  async clearWishlist(userId: number) {
    await this.prisma.wishlist.deleteMany({ where: { userId } });
    return { message: 'Wishlist cleared successfully' };
  }
}
