import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '../mailer/mailer.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '1h' },
    }),
    MailerModule,
  ],
  providers: [AuthService, GoogleStrategy, FacebookStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
