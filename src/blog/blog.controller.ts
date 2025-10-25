import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlogService } from './blog.service';

@Controller('blog')
export class BlogController {
  constructor(private blogService: BlogService) {}

  @Get()
  async getAll(@Query('publishedOnly') publishedOnly?: string) {
    const onlyPublished = publishedOnly !== 'false';
    return this.blogService.getAll(onlyPublished);
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.blogService.getBySlug(slug);
  }
}
