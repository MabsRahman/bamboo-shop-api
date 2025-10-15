import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateRatingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  review?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
