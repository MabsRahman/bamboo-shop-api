import { Controller, Post, Body, UseGuards, Req, Get, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Req() req: AuthRequest, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(req.user.sub, dto);
  }

  @Get('my')
  async getMyOrders(@Req() req: AuthRequest, @Query('status') status?: string,@Query('page') page = '1', @Query('limit') limit = '10') {
    const pageNumber = Number(page);
    const pageSize = Number(limit);
    return this.orderService.getOrdersByUser(
      Number(req.user.sub),
      status,
      pageNumber,
      pageSize,
    );
  }
}
