import { Controller, Get, Patch, Body, UseGuards, Req, Post, Param, Delete, Query,ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { Request } from 'express';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  async getProfile(@Req() req: AuthRequest) {
    return this.userService.getProfile(req.user.sub);
  }

  @Patch()
  async updateProfile(@Req() req: AuthRequest, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(req.user.sub, dto);
  }

  @Patch('password')
  async changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.sub, dto);
  }

  @Post('subscribe')
  async subscribe(@Req() req: AuthRequest) {
    return this.userService.updateSubscription(req.user.sub, true);
  }

  @Post('unsubscribe')
  async unsubscribe(@Req() req: AuthRequest) {
    return this.userService.updateSubscription(req.user.sub, false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Get('admin/all')
  async getAllUsers(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.userService.findAllAdmin(
      search, 
      Number(page), 
      Number(limit)
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Get('admin/:id/details')
  async getFullDetails(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserFullDetails(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Delete('admin/:id')
  async deleteUser(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.userService.removeUser(req.user.sub, id);
  }

}
