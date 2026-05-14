import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [DeliveryController],
  providers: [DeliveryService],
  imports: [PrismaModule, AuthModule],
})
export class DeliveryModule {}
