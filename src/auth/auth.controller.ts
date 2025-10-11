import { Controller, Post, Body, Get, Query, Res, UnauthorizedException, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
  ) {
    return this.authService.register(name, email, password);
  }

  @Get('verify')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
  
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('rememberMe') rememberMe: boolean,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.login(email, password, rememberMe);

    if (refresh_token) {
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, 
      });
    }

    return { access_token };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res({ passthrough: true }) res: Response) {
    const { email, displayName } = req.user;

    const { access_token, refresh_token } = await this.authService.validateOAuthLogin(email, displayName, 'google');

    if (refresh_token) {
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return { access_token };
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {}
  
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req, @Res({ passthrough: true }) res: Response) {
    const { email, displayName } = req.user;

    const { access_token, refresh_token } = await this.authService.validateOAuthLogin(email, displayName, 'facebook');

    if (refresh_token) {
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return { access_token };
  }

  @Post('refresh-token')
  async refreshToken(@Res({ passthrough: true }) res: Response, @Body('userId') userId: number) {
    const refresh_token = res.req.cookies['refresh_token'];
    if (!refresh_token) throw new UnauthorizedException('No refresh token found');

    const { access_token } = await this.authService.refreshToken(userId, refresh_token);
    return { access_token };
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response, @Body('userId') userId: string | number) {
    const numericUserId = Number(userId);
    await this.authService.logout(numericUserId);

    res.clearCookie('refresh_token', { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Logged out successfully' };
  }
  
}
