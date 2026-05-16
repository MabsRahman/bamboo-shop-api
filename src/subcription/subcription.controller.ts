import { Controller, Post, Get, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SubcriptionService } from './subcription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('subcription')
export class SubcriptionController {
  constructor(private readonly subcriptionService: SubcriptionService) {}

  @Post('subscribe')
  subscribe(@Body('email') email: string) {
    return this.subcriptionService.subscribe(email);
  }

  @Post('unsubscribe')
  unsubscribe(@Body('email') email: string) {
    return this.subcriptionService.unsubscribe(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  @Roles(1, 2)
  async getAllSubscribers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.subcriptionService.findAllSubscribers(Number(page), Number(limit));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('admin/send-bulk')
  @Roles(1, 2)
  @HttpCode(HttpStatus.ACCEPTED)
  async sendGuestBulk(@Body() dto: { subject: string; message: string }) {
    return this.subcriptionService.broadcastToGuests(dto.subject, dto.message);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/history')
  @Roles(1, 2)
  async getGuestHistory() {
    return this.subcriptionService.getGuestCampaignHistory();
  }
}