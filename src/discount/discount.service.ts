import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDiscountDto) {
    const product = await this.prisma.product.findUnique({ 
      where: { id: dto.productId } 
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const start = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const end = dto.endsAt ? new Date(dto.endsAt) : null;

    if (end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const overlapping = await this.prisma.discount.findFirst({
      where: {
        productId: dto.productId,
        OR: [
          {
            startsAt: { lte: end || undefined },
            endsAt: { gte: start },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('An active discount already exists for this time range');
    }

    return this.prisma.discount.create({ 
      data: {
        ...dto,
        startsAt: start,
        endsAt: end
      } 
    });
  }

  async update(id: number, dto: UpdateDiscountDto) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');

    return this.prisma.discount.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async remove(id: number) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');

    return this.prisma.discount.delete({ where: { id } });
  }

  async findAll() {
    return this.prisma.discount.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: { product: true }
    });
    if (!discount) throw new NotFoundException('Discount not found');
    return discount;
  }

  async getActiveDiscounts() {
    const now = new Date();
    return this.prisma.discount.findMany({
      where: {
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      }
    });
  }
}