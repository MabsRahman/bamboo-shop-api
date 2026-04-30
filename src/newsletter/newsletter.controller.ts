import { Controller, Post, Get, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('newsletter') 
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get('unsubscribe')
  async unsubscribe(@Query('email') email: string) {
    return this.newsletterService.unsubscribeUser(email);
  }

  @Get('subscribe')
  async subscribe(@Query('email') email: string) {
    return this.newsletterService.subscribeUser(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('admin/send-bulk')
  @Roles(1, 2)
  @HttpCode(HttpStatus.ACCEPTED)
  async sendBulkAnnouncement(@Body() dto: any) {
    return this.newsletterService.broadcastToSubscribers(dto.subject, dto.message);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/history')
  @Roles(1, 2)
  async getHistory() {
    return this.newsletterService.getCampaignHistory();
  }
}