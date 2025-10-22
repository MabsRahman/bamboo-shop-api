import { Controller, Get, Patch, Body, UseGuards, Req, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { Request } from 'express';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';

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

}
