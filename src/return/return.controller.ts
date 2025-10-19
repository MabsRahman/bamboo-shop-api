import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ReturnService } from './return.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';

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
    return this.returnService.createReturnRequest(req.user.sub, dto.orderId, dto.items);
  }

  @Get('my')
  async getMyReturns(@Req() req: AuthRequest) {
    return this.returnService.getUserReturns(req.user.sub);
  }
}
