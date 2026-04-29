import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, mobile: true, createdAt: true, updatedAt: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      return user;
    } catch (error) {
      if (error.code === 'P2002' || error.code === 'P2025') {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Something went wrong while fetching profile');
    }
  }

  async updateProfile(userId: number, dto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: dto,
        select: { id: true, name: true, mobile: true, updatedAt: true },
      });
      return { statusCode: 200, message: 'User profile updated successfully' };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Duplicate value error');
      }

      if (error.code === 'P2025') {
        throw new BadRequestException('User not found');
      }
      throw new BadRequestException(error.message);
    }
  }
  
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const valid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!valid) throw new UnauthorizedException('Old password is incorrect');

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)?(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;
    if (!passwordRegex.test(dto.newPassword)) {
      throw new BadRequestException(
        'New password must be at least 6 characters long, contain at least one letter, and at least one special character'
      );
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { statusCode: 200, message: 'Password changed successfully' };
  }

   async updateSubscription(userId: number, isSubscribed: boolean) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isSubscribed },
    });

    if (!user) throw new NotFoundException('User not found');

    return { message: `User ${isSubscribed ? 'subscribed' : 'unsubscribed'} successfully` };
  }

  async findAllAdmin(search?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getUserFullDetails(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        ratings: {
          include: { 
            product: { 
              select: { name: true } 
            } 
          }
        },
        _count: {
          select: { 
            orders: true,
            ratings: true
          }
        }
      }
    });

    if (!user) throw new NotFoundException('User not found');

    const { password, ...details } = user;
    return details;
  }

  async removeUser(adminId: number, targetId: number) {
    if (adminId === targetId) {
      throw new BadRequestException('You cannot delete your own admin account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: { _count: { select: { orders: true } } }
    });

    if (!user) throw new NotFoundException('User not found');

    if (user._count.orders > 0) {
      throw new BadRequestException(
        'Cannot delete user with existing orders. Please deactivate them instead for record keeping.'
      );
    }

    return this.prisma.user.delete({ where: { id: targetId } });
  }

}
