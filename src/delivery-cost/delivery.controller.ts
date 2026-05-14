import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Post()
  create(
    @Body('city') city: string,
    @Body('cost') cost: number,
  ) {
    return this.deliveryService.createDelivery(city, cost);
  }

  @Get()
  findAll() {
    return this.deliveryService.getAllDelivery();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body('city') city: string,
    @Body('cost') cost: number,
  ) {
    return this.deliveryService.updateDelivery(id, city, cost);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryService.deleteDelivery(id);
  }
}