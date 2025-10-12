import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { slugify } from '../utils/slugify';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async createCategory(name: string) {
    const slug = slugify(name);

    try {
      const category = await this.prisma.category.create({
        data: { name, slug },
      });
      return { message: 'Category created successfully' };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Category name must be unique');
      }
      throw err;
    }
  }

  async getAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCategoryById(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async updateCategory(id: number, name: string) {
    const slug = slugify(name);
    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: { name, slug },
      });
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Category name must be unique');
      }
      throw err;
    }
  }

  async deleteCategory(id: number) {
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}
