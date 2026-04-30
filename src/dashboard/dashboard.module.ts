import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardService, PrismaService],
  imports: [AuthModule]
})
export class DashboardModule {}
