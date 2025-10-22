import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.name.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        categoryId: dto.categoryId,
      },
    });

    if (dto.tags?.length) {
      for (const tagName of dto.tags) {
        let tag = await this.prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await this.prisma.tag.create({ data: { name: tagName } });
        }
        await this.prisma.productTag.create({ data: { productId: product.id, tagId: tag.id } });
      }
    }

    if (dto.images?.length) {
      for (const img of dto.images) {
        await this.prisma.productImage.create({
          data: {
            productId: product.id,
            url: img.url,
            isPrimary: img.isPrimary || false,
          },
        });
      }
    }

    return product;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'createdAt' | 'name' | 'rating';
    order?: 'asc' | 'desc';
    featured?: boolean;
  }) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      order = 'desc',
      featured,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (minPrice || maxPrice) where.price = {};
    if (minPrice) where.price.gte = minPrice;
    if (maxPrice) where.price.lte = maxPrice;
    if (featured !== undefined) where.isFeatured = featured;

    const products = await this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: true,
        images: true,
        tags: { include: { tag: true } },
        ratings: true,
        discounts: true,
      },
    });

    const now = new Date();

    const productsWithExtras = products.map((p) => {
      const activeDiscount = p.discounts?.filter(
        (d) =>
          (!d.startsAt || d.startsAt <= now) &&
          (!d.endsAt || d.endsAt >= now)
      )[0];

      const discountedPrice = activeDiscount
        ? activeDiscount.type === 'percentage'
          ? p.price * (1 - activeDiscount.value / 100)
          : p.price - activeDiscount.value
        : p.price;

      const averageRating =
        p.ratings.length > 0
          ? p.ratings.reduce((sum, r) => sum + r.rating, 0) / p.ratings.length
          : 0;

      return {
        ...p,
        discountedPrice,
        averageRating,
      };
    });

    if (sortBy === 'rating') {
      productsWithExtras.sort((a, b) =>
        order === 'asc'
          ? (a.averageRating ?? 0) - (b.averageRating ?? 0)
          : (b.averageRating ?? 0) - (a.averageRating ?? 0),
      );
    } else {
      productsWithExtras.sort((a, b) =>
        order === 'asc'
          ? (a[sortBy] as number) - (b[sortBy] as number)
          : (b[sortBy] as number) - (a[sortBy] as number),
      );
    }

    return productsWithExtras;
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        tags: { include: { tag: true } },
        ratings: true,
        discounts: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const now = new Date();

    const activeDiscount = product.discounts?.filter(
      (d) =>
        (!d.startsAt || d.startsAt <= now) &&
        (!d.endsAt || d.endsAt >= now)
    )[0];

    const discountedPrice = activeDiscount
      ? activeDiscount.type === 'percentage'
        ? product.price * (1 - activeDiscount.value / 100)
        : product.price - activeDiscount.value
      : product.price;

    const averageRating =
      product.ratings.length > 0
        ? product.ratings.reduce((sum, r) => sum + r.rating, 0) / product.ratings.length
        : 0;

    return {
      ...product,
      discountedPrice,
      averageRating,
    };
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.name ? dto.name.toLowerCase().replace(/\s+/g, '-') : undefined,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      },
    });

    if (dto.tags?.length) {
      await this.prisma.productTag.deleteMany({ where: { productId: id } });

      for (const tagName of dto.tags) {
        let tag = await this.prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await this.prisma.tag.create({ data: { name: tagName } });
        }
        await this.prisma.productTag.create({ data: { productId: id, tagId: tag.id } });
      }
    }

    if (dto.images?.length) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });

      for (const img of dto.images) {
        await this.prisma.productImage.create({
          data: { productId: id, url: img.url, isPrimary: img.isPrimary || false },
        });
      }
    }

    return updated;
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  async subscribeBackInStock(userId: number, productId: number) {
    const exists = await this.prisma.stockSubscription.findFirst({
      where: { userId, productId },
    });
    if (exists) throw new BadRequestException('Already subscribed for this product');

    const subscription = await this.prisma.stockSubscription.create({
      data: { userId, productId },
    });

    return { message: 'Subscribed to back-in-stock notifications', subscription };
  }

  async unsubscribeBackInStock(userId: number, productId: number) {
    const deleted = await this.prisma.stockSubscription.deleteMany({
      where: { userId, productId },
    });

    if (deleted.count === 0)
      throw new BadRequestException('No subscription found for this product');

    return { message: 'Unsubscribed from back-in-stock notifications' };
  }
}
