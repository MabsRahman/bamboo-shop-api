import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  // CREATE
  async createDelivery(city: string, cost: number) {
    if (!city || cost == null) {
      throw new BadRequestException('City and cost are required');
    }

    return this.prisma.deliveryCost.create({
      data: {
        city,
        cost,
      },
    });
  }

  async getAllDelivery() {
    return this.prisma.deliveryCost.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async updateDelivery(id: number, city: string, cost: number) {
    const existing = await this.prisma.deliveryCost.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Delivery cost not found');
    }

    return this.prisma.deliveryCost.update({
      where: { id },
      data: {
        city,
        cost,
      },
    });
  }

  async deleteDelivery(id: number) {
    const existing = await this.prisma.deliveryCost.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Delivery cost not found');
    }

    return this.prisma.deliveryCost.delete({
      where: { id },
    });
  }
}