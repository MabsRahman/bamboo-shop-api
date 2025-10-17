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
    return this.cartService.getUserCart(req.user.sub);
  }

  @Post()
  addToCart(@Req() req: AuthRequest, @Body() dto: CreateCartDto) {
    return this.cartService.addToCart(req.user.sub, dto);
  }

  @Patch(':id')
  updateCart(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateCartDto) {
    return this.cartService.updateCartItem(Number(id), req.user.sub, dto);
  }

  @Delete(':id')
  removeItem(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.cartService.removeCartItem(Number(id), req.user.sub);
  }

  @Delete()
  clearCart(@Req() req: AuthRequest) {
    return this.cartService.clearCart(req.user.sub);
  }
}
