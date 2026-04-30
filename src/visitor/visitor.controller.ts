import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { VisitorService } from './visitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

@Controller('visitor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Get('admin') 
  @Roles(1, 2)
  async getAllVisits(
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('path') path?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.visitorService.getVisits({ search, city, country, path, page, limit });
  }

  @Get('admin/stats')
  @Roles(1, 2)
  async getStats() {
    const total = await this.visitorService.getVisitsCount();
    return { total_visitors: total };
  }
}