import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import validator from 'validator';
import { MailerService } from '../mailer/mailer.service';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async register(name: string, email: string, password: string) {
    if (!email || !name || !password) {
      throw new BadRequestException('Name, email, and password are required');
    }
    if (!validator.isEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (!/^(?=.*[a-zA-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{6,}$/.test(password)) {
      throw new BadRequestException(
        'Password must be at least 6 characters long and contain at least one letter and one special character',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { email: true },
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const token = randomBytes(32).toString('hex');
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          verificationToken: token,
        },
        select: { id: true, email: true, name: true, verificationToken: true },
      });

      await this.mailerService.sendVerificationEmail(user.email, user.name, token);
      return { message: 'Registration successful. Please verify your email.' };
      
    } catch (error) {
      this.logger.error(`Failed to register user: ${error.message}`);
      throw new BadRequestException('Failed to register user');
    }
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) throw new BadRequestException('Invalid or expired token');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null },
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async login(email: string, password: string, rememberMe: boolean) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, isVerified: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });

    let refresh_token: string | null = null;
    if (rememberMe) {
      const token = uuidv4();
      const hashedToken = await bcrypt.hash(token, 10);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedToken },
      });

      refresh_token = token;
    }
    
    return { access_token, refresh_token };
  }

  async validateOAuthLogin(email: string, name: string, provider: 'google' | 'facebook', rememberMe = true) {
    if (!email) throw new BadRequestException(`${provider} account has no email`);

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        name,
        isVerified: true,
      },
      create: {
        email,
        name,
        isVerified: true,
        password: uuidv4(),
      },
    });

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });

    let refresh_token: string | null = null;
    if (rememberMe) {
      const token = uuidv4();
      const hashedToken = await bcrypt.hash(token, 10);
      await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedToken } });
      refresh_token = token;
    }

    return { access_token, refresh_token, userId: user.id };
  }

  async refreshToken(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException('Invalid refresh token');

    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });

    return { access_token };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('No user found with that email');

    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60);

    await this.prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: token,
        resetTokenExpiry: expiry,
      },
    });

    await this.mailerService.sendPasswordResetEmail(user.email, user.name, token);

    return { message: 'Password reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetPasswordToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successful. You can now log in.' };
  }

  async logout(userId: number) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    } catch (err) {
      throw new BadRequestException('User not found');
    }
    return { message: 'Logged out successfully' };
  }

}