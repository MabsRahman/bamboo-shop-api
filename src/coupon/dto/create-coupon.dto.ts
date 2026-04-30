import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsEnum(['fixed', 'percentage'])
  type: string;

  @IsNumber()
  value: number;

  @IsString()
  @IsOptional()
  message?: string;
  
  @IsNumber()
  @IsOptional()
  usageLimit?: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsArray()
  @IsOptional()
  productIds?: number[];

  @IsArray()
  @IsOptional()
  userIds?: number[];
}