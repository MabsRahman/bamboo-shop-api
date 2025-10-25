import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateContactDto {
  @IsOptional()
  userId?: number;

  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  subject: string;

  @IsNotEmpty()
  message: string;
}
