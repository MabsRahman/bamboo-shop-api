import { Controller, Post, Body, UseGuards, Req, Get, Query, Patch, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

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

  @UseGuards(RolesGuard)
  @Roles(1, 2)
  @Get('admin/all')
  async getAllOrders(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('userId') userId?: string, 
    @Query('search') search?: string,
  ) {
    return this.orderService.getAllOrdersForAdmin(
      Number(page),
      Number(limit),
      status,
      paymentMethod,
      fromDate,
      toDate,
      userId ? Number(userId) : undefined,
      search,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(1, 2)
  @Get('admin/:id')
  async getOrderDetails(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderDetailForAdmin(id);
  }

  @UseGuards(RolesGuard)
  @Roles(1, 2)
  @Patch('admin/:id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.orderService.updateOrderStatus(id, status);
  }

  @UseGuards(RolesGuard)
  @Roles(1) 
  @Delete('admin/:id')
  async removeOrder(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.deleteOrder(id);
  }
}
