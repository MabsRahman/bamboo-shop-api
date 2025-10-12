import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDiscountDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new BadRequestException('Product not found');

    return this.prisma.discount.create({ data: dto });
  }

  async update(id: number, dto: UpdateDiscountDto) {
    return this.prisma.discount.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return this.prisma.discount.delete({ where: { id } });
  }

  async findAll() {
    return this.prisma.discount.findMany({ include: { product: true } });
  }

  async findOne(id: number) {
    return this.prisma.discount.findUnique({ where: { id }, include: { product: true } });
  }
}