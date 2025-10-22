import { Test, TestingModule } from '@nestjs/testing';
import { CartReminderService } from './cart-reminder.service';

describe('CartReminderService', () => {
  let service: CartReminderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CartReminderService],
    }).compile();

    service = module.get<CartReminderService>(CartReminderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
