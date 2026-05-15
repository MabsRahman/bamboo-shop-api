import { Test, TestingModule } from '@nestjs/testing';
import { SubcriptionController } from './subcription.controller';

describe('SubcriptionController', () => {
  let controller: SubcriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubcriptionController],
    }).compile();

    controller = module.get<SubcriptionController>(SubcriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
