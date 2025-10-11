import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAddressDto {
  @IsString() street: string;
  @IsString() houseno: string;
  @IsString() city: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}