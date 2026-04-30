import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService, private mailerService: MailerService) {}

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
      include: {
        user: { select: { name: true, email: true } }
      }
    });
  }

  async getMessageById(id: number) {
    const msg = await this.prisma.contactMessage.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }

  async replyToMessage(id: number, replyContent: string) {
    const original = await this.getMessageById(id);

    try {
      await this.mailerService.sendContactReplyEmail(
        original.email,
        original.name,
        original.subject,
        original.message,
        replyContent
      );
    } catch (error) {
      console.error('Email Dispatch Error:', error);
      throw new BadRequestException('Failed to send email. Please check your mail configuration.');
    }

    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        isReplied: true,
        replyMessage: replyContent,
      },
    });
  }

}
