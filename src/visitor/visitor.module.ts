import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { VisitorController } from './visitor.controller';
import { VisitorService } from './visitor.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { VisitorMiddleware } from './visitor.middleware';

@Module({
  controllers: [VisitorController],
  providers: [VisitorService, PrismaService],
  imports: [PrismaModule, AuthModule],
})
export class VisitorModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(VisitorMiddleware).forRoutes('*');
  }
}
