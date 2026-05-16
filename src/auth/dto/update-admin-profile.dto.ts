import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateAdminProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}