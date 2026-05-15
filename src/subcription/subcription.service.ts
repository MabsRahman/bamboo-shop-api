import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubcriptionService {
  constructor(private prisma: PrismaService) {}

  async subscribe(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.prisma.emailSubscribe.findUnique({
      where: { email },
    });

    if (existing) {
      if (!existing.isActive) {
        await this.prisma.emailSubscribe.update({
          where: { email },
          data: { isActive: true },
        });
      }
      return true;
    }

    await this.prisma.emailSubscribe.create({
      data: {
        email,
        isActive: true,
      },
    });

    return true;
  }

  async unsubscribe(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.prisma.emailSubscribe.findUnique({
      where: { email },
    });

    if (!existing) {
      return true;
    }

    await this.prisma.emailSubscribe.update({
      where: { email },
      data: { isActive: false },
    });

    return true;
  }
}