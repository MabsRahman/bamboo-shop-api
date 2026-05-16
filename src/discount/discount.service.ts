import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountService {
  constructor(private prisma: PrismaService) {}

  private mapDiscountStatus(discount: any) {
    const now = new Date();
    let status: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' = 'ACTIVE';

    if (discount.startsAt > now) {
      status = 'SCHEDULED';
    } else if (discount.endsAt && discount.endsAt < now) {
      status = 'EXPIRED';
    }

    return { ...discount, status };
  }

  async create(dto: CreateDiscountDto) {
    const product = await this.prisma.product.findUnique({ 
      where: { id: dto.productId } 
    });
    if (!product) throw new BadRequestException('Product not found');

    const start = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const end = dto.endsAt ? new Date(dto.endsAt) : null;

    if (end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const conditions: any[] = [
      { startsAt: { lte: start }, OR: [{ endsAt: null }, { endsAt: { gte: start } }] }
    ];

    if (end) {
      conditions.push({ startsAt: { lte: end }, OR: [{ endsAt: null }, { endsAt: { gte: end } }] });
      conditions.push({ startsAt: { gte: start }, endsAt: { lte: end } });
    } else {
      conditions.push({ startsAt: { gte: start } });
    }

    const overlapping = await this.prisma.discount.findFirst({
      where: {
        productId: dto.productId,
        OR: conditions
      },
    });

    if (overlapping) {
      throw new BadRequestException('An active or scheduled discount already conflicts with this time range');
    }

    const created = await this.prisma.discount.create({ 
      data: {
        productId: dto.productId,
        value: dto.value,
        type: dto.type,
        startsAt: start,
        endsAt: end
      },
      include: {
        product: { select: { id: true, name: true, price: true } }
      }
    });

    return this.mapDiscountStatus(created);
  }

  async update(id: number, dto: UpdateDiscountDto) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');

    const updated = await this.prisma.discount.update({
      where: { id },
      data: {
        value: dto.value,
        type: dto.type,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt !== undefined ? (dto.endsAt ? new Date(dto.endsAt) : null) : undefined,
      },
      include: {
        product: { select: { id: true, name: true, price: true } }
      }
    });

    return this.mapDiscountStatus(updated);
  }

  async remove(id: number) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');

    await this.prisma.discount.delete({ where: { id } });
    return { message: 'Discount promotion terminated successfully' };
  }

  async findAll() {
    const discounts = await this.prisma.discount.findMany({
      include: {
        product: { select: { id: true, name: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return discounts.map(d => this.mapDiscountStatus(d));
  }

  async findOne(id: number) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: { product: true }
    });
    if (!discount) throw new NotFoundException('Discount not found');
    return this.mapDiscountStatus(discount);
  }

  async getActiveDiscounts() {
    const now = new Date();
    const active = await this.prisma.discount.findMany({
      where: {
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } }
        ]
      },
      include: {
        product: { select: { id: true, name: true, price: true } }
      }
    });

    return active.map(d => this.mapDiscountStatus(d));
  }
}