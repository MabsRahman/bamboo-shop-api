import { Controller, Post, Body } from '@nestjs/common';
import { SubcriptionService } from './subcription.service';

@Controller('subcription')
export class SubcriptionController {
  constructor(private readonly subcriptionService: SubcriptionService) {}

  @Post('subscribe')
  subscribe(@Body('email') email: string) {
    return this.subcriptionService.subscribe(email);
  }

  @Post('unsubscribe')
  unsubscribe(@Body('email') email: string) {
    return this.subcriptionService.unsubscribe(email);
  }
}