import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Injectable()
export class RatingService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRatingDto, userId: number) {
    return this.prisma.rating.create({
      data: { ...dto, userId },
    });
  }

  async findAll(productId?: number) {
    return this.prisma.rating.findMany({
      where: {
        status: 'APPROVED',
        ...(productId ? { productId } : {}),
      },
      include: { 
        user: {
          select: { name: true }
        }, 
        product: {
          select: { name: true }
        } 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Rating not found');
    return rating;
  }

  async update(id: number, dto: CreateRatingDto, userId: number) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating || rating.userId !== userId) {
      throw new UnauthorizedException('You can only update your own rating');
    }
    return this.prisma.rating.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating || rating.userId !== userId) {
      throw new UnauthorizedException('You can only delete your own rating');
    }
    return this.prisma.rating.delete({ where: { id } });
  }

  async findAllAdmin(status?: string, productId?: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.prisma.rating.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(productId ? { productId } : {}),
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, product: true },
    });
  }

  async updateStatus(id: number, status: string) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Rating not found');

    return this.prisma.rating.update({
      where: { id },
      data: { status },
    });
  }

  async adminRemove(id: number) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Rating not found');

    return this.prisma.rating.delete({ where: { id } });
  }

}
