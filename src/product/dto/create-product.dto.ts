import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsString() name: string;
  @IsString() description?: string;
  @IsNumber() price: number;
  @IsNumber() stock: number;
  @IsNumber() categoryId: number;
  @IsArray() tags?: string[];
  @IsArray() images?: { url: string; isPrimary?: boolean }[];
}

