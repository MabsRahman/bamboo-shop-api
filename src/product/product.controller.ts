import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';
interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: number,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy?: 'price' | 'createdAt' | 'name' | 'rating',
    @Query('order') order?: 'asc' | 'desc',
    @Query('featured') featured?: boolean,
  ) {
    return this.productService.findAll({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      categoryId: categoryId ? Number(categoryId) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy,
      order,
      featured,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/subscribe-stock')
  async subscribeStock(@Req() req: AuthRequest, @Param('id') productId: string) {
    return this.productService.subscribeBackInStock(req.user.sub, Number(productId));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/unsubscribe-stock')
  async unsubscribeStock(@Req() req: AuthRequest, @Param('id') productId: string) {
    return this.productService.unsubscribeBackInStock(req.user.sub, Number(productId));
  }

}
