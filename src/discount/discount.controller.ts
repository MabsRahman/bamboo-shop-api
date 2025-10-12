import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { DiscountService } from './discount.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Controller('discounts')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Post()
  create(@Body() dto: CreateDiscountDto) {
    return this.discountService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.discountService.remove(Number(id));
  }

  @Get()
  findAll() {
    return this.discountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.discountService.findOne(Number(id));
  }
}