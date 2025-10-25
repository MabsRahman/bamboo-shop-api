// src/blog/blog.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBlogDto) {
    return this.prisma.blogPost.create({ data: dto });
  }

  async update(id: number, dto: UpdateBlogDto) {
    const blog = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!blog) throw new NotFoundException('Blog post not found');
    return this.prisma.blogPost.update({ where: { id }, data: dto });
  }

  async getAll(publishedOnly = true) {
    return this.prisma.blogPost.findMany({
      where: publishedOnly ? { isPublished: true } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBySlug(slug: string) {
    const blog = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!blog) throw new NotFoundException('Blog post not found');
    if (!blog.isPublished) throw new NotFoundException('Blog post not published yet');
    return blog;
  }
}
