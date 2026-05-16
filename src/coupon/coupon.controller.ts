import { Controller, Get, Post, Body, Param, Delete, UseGuards, ParseIntPipe, Query, BadRequestException, Req } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Post('admin')
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Get('admin')
  findAll() {
    return this.couponService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Get('admin/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.couponService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Delete('admin/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponService.remove(id);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  async validate(
    @Body() body: { code: string; productIds: number[] },
    @Req() req: any
  ) {
    if (!body.code) {
      throw new BadRequestException('Coupon code is required');
    }
    return this.couponService.validateCoupon(body.code, req.user.id, body.productIds);
  }
}