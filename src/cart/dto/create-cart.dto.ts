import { IsInt, Min } from 'class-validator';

export class CreateCartDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}