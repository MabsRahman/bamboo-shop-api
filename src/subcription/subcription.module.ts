import { Module } from '@nestjs/common';
import { SubcriptionController } from './subcription.controller';
import { SubcriptionService } from './subcription.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [SubcriptionController],
  providers: [SubcriptionService],
  imports: [PrismaModule, AuthModule],
})
export class SubcriptionModule {}
