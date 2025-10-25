// src/contact/contact.controller.ts
import { Controller, Post, Body, Req } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';

interface AuthRequest extends Request {
  user: JwtPayload;
}


@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  async create(@Body() dto: CreateContactDto, @Req() req?: AuthRequest) {
    if (req?.user) {
      dto.userId = Number(req.user.sub);
    }
    const message = await this.contactService.createMessage(dto);
    return { success: true, message: 'Your message has been received!', data: message };
  }
}
