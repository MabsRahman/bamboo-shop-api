import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateDiscountDto {
  @IsNumber()
  productId: number;

  @IsString()
  type: 'fixed' | 'percentage';

  @IsNumber()
  value: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;
}
