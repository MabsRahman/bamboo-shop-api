import { Controller, Get, Post, Delete, Param, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post(':productId')
  async addToWishlist(@Req() req: AuthRequest, @Param('productId') productId: string) {
    const userId = req.user?.sub;
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.wishlistService.addToWishlist(userId, Number(productId));
  }

  @Get()
  async getWishlist(@Req() req: AuthRequest) {
    const userId = req.user?.sub;
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.wishlistService.getUserWishlist(userId);
  }

  @Delete(':productId')
  async removeFromWishlist(@Req() req: AuthRequest, @Param('productId') productId: string) {
    const userId = req.user?.sub;
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.wishlistService.removeFromWishlist(userId, Number(productId));
  }
  
  @Delete()
  async clearWishlist(@Req() req: AuthRequest) {
    const userId = req.user?.sub;
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.wishlistService.clearWishlist(userId);
  }
}
