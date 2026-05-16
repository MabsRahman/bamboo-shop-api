import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const generatedSlug = dto.name.toLowerCase().replace(/\s+/g, '-');

    return await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: generatedSlug,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        categoryId: dto.categoryId,
        isFeatured: dto.isFeatured || false,
        images: dto.images?.length ? {
          create: dto.images.map(img => ({
            url: img.url,
            isPrimary: img.isPrimary || false
          }))
        } : undefined,
        tags: dto.tags?.length ? {
          create: dto.tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName }
              }
            }
          }))
        } : undefined
      },
      include: {
        images: true,
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'createdAt' | 'name' | 'rating' | 'stock';
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
      orderBy: sortBy !== 'rating' && sortBy !== 'stock' ? { [sortBy]: order } : undefined
    });

    const now = new Date();

    const productsWithExtras = products.map((p) => {
      const activeDiscount = p.discounts?.filter(
        (d) =>
          (!d.startsAt || d.startsAt <= now) &&
          (!d.endsAt || d.endsAt >= now)
      )[0];

      const rawPrice = activeDiscount
        ? activeDiscount.type === 'percentage'
          ? p.price * (1 - activeDiscount.value / 100)
          : p.price - activeDiscount.value
        : p.price;

      const discountedPrice = Number(rawPrice.toFixed(2));

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
    } else if (sortBy === 'stock') {
      productsWithExtras.sort((a, b) => {
        if (a.stock === 0 && b.stock !== 0) return -1;
        if (a.stock !== 0 && b.stock === 0) return 1;
        return a.stock - b.stock;
      });
    } else {
      productsWithExtras.sort((a, b) =>
        order === 'asc'
          ? (a[sortBy] as number) - (b[sortBy] as number)
          : (b[sortBy] as number) - (a[sortBy] as number),
      );
    }

    return productsWithExtras;
  }
  

  async findByCategory(categoryId: number) {
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      include: {
        category: true,
        images: true,
        tags: { include: { tag: true } },
        ratings: true,
        discounts: true,
      },
    });

    const now = new Date();

    return products.map((p) => {
      const activeDiscount = p.discounts?.find(
        (d) =>
          (!d.startsAt || d.startsAt <= now) &&
          (!d.endsAt || d.endsAt >= now),
      );

      const rawPrice = activeDiscount
        ? activeDiscount.type === 'percentage'
          ? p.price * (1 - activeDiscount.value / 100)
          : p.price - activeDiscount.value
        : p.price;

      const discountedPrice = Number(rawPrice.toFixed(2));

      const averageRating =
        p.ratings.length > 0
          ? p.ratings.reduce((sum, r) => sum + r.rating, 0) /
            p.ratings.length
          : 0;

      return {
        ...p,
        discountedPrice,
        averageRating,
      };
    });
  }

  async findFeatured(limit = 6) {
    const products = await this.prisma.product.findMany({
      where: { isFeatured: true },
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

    return products.map((p) => {
      const activeDiscount = p.discounts?.find(
        (d) =>
          (!d.startsAt || d.startsAt <= now) &&
          (!d.endsAt || d.endsAt >= now)
      );

      const rawPrice = activeDiscount
        ? activeDiscount.type === 'percentage'
          ? p.price * (1 - activeDiscount.value / 100)
          : p.price - activeDiscount.value
        : p.price;

      const discountedPrice = Number(rawPrice.toFixed(2));

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
  }


  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        tags: { include: { tag: true } },
        ratings: {
          where: {
            status: 'approved',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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

    const rawPrice = activeDiscount
      ? activeDiscount.type === 'percentage'
        ? product.price * (1 - activeDiscount.value / 100)
        : product.price - activeDiscount.value
      : product.price;

    const discountedPrice = Math.round(rawPrice * 100) / 100;

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

    const generatedSlug = dto.name ? dto.name.toLowerCase().replace(/\s+/g, '-') : undefined;

    if (dto.tags) {
      await this.prisma.productTag.deleteMany({ where: { productId: id } });
    }
    if (dto.images) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
    }

    return await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug: generatedSlug,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        categoryId: dto.categoryId,
        isFeatured: dto.isFeatured,
        images: dto.images?.length ? {
          create: dto.images.map(img => ({
            url: img.url,
            isPrimary: img.isPrimary || false
          }))
        } : undefined,
        tags: dto.tags?.length ? {
          create: dto.tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName }
              }
            }
          }))
        } : undefined
      },
      include: {
        images: true,
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
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
