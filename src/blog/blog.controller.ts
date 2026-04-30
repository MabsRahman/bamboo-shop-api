import { Controller, Get, Param, Query, ParseIntPipe, Post, Patch, Delete, UseGuards, Body } from '@nestjs/common';
import { BlogService } from './blog.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/guards/roles.decorator';
import { CreateBlogDto } from './dto/create-blog.dto';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Post('/admin')
  async create(@Body() dto: CreateBlogDto) {
    return this.blogService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Patch('/admin/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.blogService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1, 2)
  @Delete('/admin/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.blogService.remove(id);
  }
}
