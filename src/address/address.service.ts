import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async getUserAddresses(userId: number) {
    try {
      const addresses = await this.prisma.address.findMany({
        where: { userId },
        orderBy: { isDefault: 'desc' },
      });

      if (!addresses || addresses.length === 0) {
        return { statusCode: 404, message: 'No addresses found', data: [] };
      }

      return { statusCode: 200, message: 'Addresses fetched successfully', data: addresses };
    } catch (error: any) {
      throw new BadRequestException({ statusCode: 400, message: error.message });
    }
  }

  async createAddress(userId: number, dto: CreateAddressDto) {
    try {
      if (dto.isDefault) {
        dto.isDefault = dto.isDefault === true || dto.isDefault === 'true';
        await this.prisma.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const address = await this.prisma.address.create({ data: { ...dto, userId } });
      return { statusCode: 201, message: 'Address created successfully' };
    } catch (error: any) {
      throw new BadRequestException({ statusCode: 400, message: error.message });
    }
  }

  async updateAddress(userId: number, addressId: number, dto: UpdateAddressDto) {
    try {
      const address = await this.prisma.address.findUnique({ where: { id: addressId } });
      if (!address || address.userId !== userId) {
        return { statusCode: 404, message: 'Address not found' };
      }

      if (dto.isDefault) {
        await this.prisma.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const updated = await this.prisma.address.update({ where: { id: addressId }, data: dto });
      return { statusCode: 200, message: 'Address updated successfully' };
    } catch (error: any) {
      throw new BadRequestException({ statusCode: 400, message: error.message });
    }
  }

  async deleteAddress(userId: number, addressId: number) {
    try {
      const address = await this.prisma.address.findUnique({ where: { id: addressId } });
      if (!address || address.userId !== userId) {
        return { statusCode: 404, message: 'Address not found' };
      }

      await this.prisma.address.delete({ where: { id: addressId } });
      return { statusCode: 200, message: 'Address deleted successfully' };
    } catch (error: any) {
      throw new BadRequestException({ statusCode: 400, message: error.message });
    }
  }

  async setDefaultAddress(userId: number, addressId: number) {
    try {
      const address = await this.prisma.address.findUnique({ where: { id: addressId } });
      if (!address || address.userId !== userId) {
        return { statusCode: 404, message: 'Address not found' };
      }

      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      const updated = await this.prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      return { statusCode: 200, message: 'Default address set successfully' };
    } catch (error: any) {
      throw new BadRequestException({ statusCode: 400, message: error.message });
    }
  }
}
