// src/contact/contact.controller.ts
import { Controller, Post, Body, Req, Get, UseGuards, ParseIntPipe, Param  } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';
import { Roles } from 'src/auth/guards/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Get('admin/all')
  async getAll() {
    return this.contactService.getAllMessages();
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Get('admin/:id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.contactService.getMessageById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Post('admin/:id/reply')
  async reply(
    @Param('id', ParseIntPipe) id: number,
    @Body('replyContent') replyContent: string
  ) {
    return this.contactService.replyToMessage(id, replyContent);
  }
}
