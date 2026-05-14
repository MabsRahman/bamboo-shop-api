import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@Req() req: AuthRequest) {
    return this.cartService.getUserCart(req.user.id);
  }

  @Post()
  addToCart(@Req() req: AuthRequest, @Body() dto: CreateCartDto) {
    return this.cartService.addToCart(req.user.id, dto);
  }

  @Patch(':productId')
  updateCart(@Req() req: AuthRequest, @Param('productId') productId: string, @Body() dto: UpdateCartDto) {
      return this.cartService.updateCartItem(Number(productId), req.user.id, dto);
  }

  @Delete(':productId')
  removeItem(@Req() req: AuthRequest, @Param('productId') id: string) {
    return this.cartService.removeCartItem(Number(id), req.user.id);
  }

  @Delete()
  clearCart(@Req() req: AuthRequest) {
    return this.cartService.clearCart(req.user.id);
  }
}
