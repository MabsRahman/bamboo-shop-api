import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import validator from 'validator';
import { MailerService } from '../mailer/mailer.service';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { InvalidatedToken } from '@prisma/client';

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

    const payload = { sub: user.id, email: user.email, role: 0 };
    const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });

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
    const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });

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
    const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });

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

  async logout(userId: number, accessToken: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });

      const decoded: any = this.jwtService.decode(accessToken);
      const expiry = new Date(decoded.exp * 1000);

      await this.prisma.invalidatedToken.create({
        data: {
          token: accessToken,
          expiresAt: expiry,
        },
      });
    } catch (err) {
      throw new BadRequestException('User not found');
    }

    return { message: 'Logged out successfully' };
  }


  async adminLogin(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, role: true, active: true },
    });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      this.logger.warn(`Failed admin login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.active) {
      throw new UnauthorizedException('Your account is deactivated. Please contact the SuperAdmin.');
    }

    const payload = { 
      sub: admin.id, 
      email: admin.email, 
      role: admin.role,
      isAdmin: true 
    };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '30d' }), 
      admin: {
        id: admin.id,
        name: admin.email,
        role: admin.role
      }
    };
  }

  async registerAdmin(name: string, email: string, password: string, role: number) {
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new BadRequestException('Admin with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await this.prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 2,
        active: true,
      },
    });

    return {
      message: 'New admin created successfully',
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    };
  }

  async getAllAdmins() {
    return this.prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleAdminStatus(adminId: number) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new BadRequestException('Admin profile not found');
    
    return this.prisma.admin.update({
      where: { id: adminId },
      data: { active: !admin.active },
      select: { id: true, active: true },
    });
  }

  async removeAdmin(adminId: number) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new BadRequestException('Admin profile not found');

    await this.prisma.admin.delete({ where: { id: adminId } });
    return { message: 'Admin account removed successfully from database records' };
  }

  async getAdminProfile(adminId: number) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    if (!admin) throw new BadRequestException('Admin profile not found');
    return admin;
  }

  async updateAdminProfile(adminId: number, name: string, email: string) {
    const duplicateEmail = await this.prisma.admin.findFirst({
      where: { email, NOT: { id: adminId } },
    });
    if (duplicateEmail) {
      throw new BadRequestException('Email address already claimed by another staff profile');
    }

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { name, email },
    });
    return { statusCode: 200, message: 'Administrative profile data synced successfully' };
  }

  async changeAdminPassword(adminId: number, dto: any) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new BadRequestException('Admin account not found');

    const validPassword = await bcrypt.compare(dto.oldPassword, admin.password);
    if (!validPassword) throw new UnauthorizedException('Current security credential verification failed');

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)?(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;
    if (!passwordRegex.test(dto.newPassword)) {
      throw new BadRequestException('New password must be at least 6 characters long and contain symbols');
    }

    const hashedToken = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedToken },
    });

    return { statusCode: 200, message: 'Administrative password updated successfully' };
  }

}