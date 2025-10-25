import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBlogDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  slug: string;

  @IsNotEmpty()
  content: string;

  @IsOptional()
  image?: string;

  @IsOptional()
  author?: string;

  @IsOptional()
  isPublished?: boolean;
}