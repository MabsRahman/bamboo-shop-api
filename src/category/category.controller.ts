import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CategoryService } from './category.service';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(@Body('name') name: string) {
    return this.categoryService.createCategory(name);
  }

  @Get()
  async findAll() {
    return this.categoryService.getAllCategories();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.getCategoryById(id);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.categoryService.updateCategory(id, name);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.deleteCategory(id);
  }
}
