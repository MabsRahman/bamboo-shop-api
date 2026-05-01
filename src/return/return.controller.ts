import { Controller, Post, Get, Body, Req, UseGuards, Delete, Query, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { ReturnService } from './return.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

interface AuthRequest extends Request {
  user: JwtPayload;
}

interface ReturnItemDto {
  productId: number;
  reason: string;
  images?: string[];
}

interface CreateReturnDto {
  orderId: number;
  items: ReturnItemDto[];
}

@UseGuards(JwtAuthGuard)
@Controller('returns')
export class ReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Post()
  async createReturn(@Req() req: AuthRequest, @Body() dto: CreateReturnDto) {
    return this.returnService.createReturnRequest(req.user.id, dto.orderId, dto.items);
  }

  @Get('my')
  async getMyReturns(@Req() req: AuthRequest) {
    return this.returnService.getUserReturns(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Get('admin/all')
  async getAllReturns(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('orderId') orderId?: string,
  ) {
    return this.returnService.getAllReturnsForAdmin(
      status,
      Number(page),
      Number(limit),
      orderId ? Number(orderId) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Patch('admin/:id/status')
  async updateReturnStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.returnService.updateReturnStatus(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Delete('admin/:id')
  async deleteReturn(@Param('id', ParseIntPipe) id: number) {
    return this.returnService.deleteReturn(id);
  }

}
