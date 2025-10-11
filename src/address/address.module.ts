import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { PrismaModule } from 'src/prisma/prisma.module'; 
import { AuthModule } from 'src/auth/auth.module';

@Module({
  providers: [AddressService, AuthModule],
  controllers: [AddressController],
  imports: [PrismaModule, AuthModule],
})
export class AddressModule {}
