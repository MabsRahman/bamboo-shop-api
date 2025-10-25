// src/contact/contact.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async createMessage(dto: CreateContactDto) {
    return this.prisma.contactMessage.create({
      data: {
        userId: dto.userId,
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
      },
    });
  }

  async getAllMessages() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
