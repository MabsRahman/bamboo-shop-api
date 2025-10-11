import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import type { Request } from 'express';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Get()
  async getAddresses(@Req() req: AuthRequest) {
    return this.addressService.getUserAddresses(req.user.sub);
  }

  @Post()
  async createAddress(@Req() req: AuthRequest, @Body() dto: CreateAddressDto) {
    return this.addressService.createAddress(req.user.sub, dto);
  }

  @Patch(':id')
  async updateAddress(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.addressService.updateAddress(req.user.sub, Number(id), dto);
  }

  @Patch(':id/default')
  async setDefault(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.addressService.setDefaultAddress(req.user.sub, Number(id));
  }

  @Delete(':id')
  async deleteAddress(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.addressService.deleteAddress(req.user.sub, Number(id));
  }
}
