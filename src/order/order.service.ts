import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Coupon, PaymentMethod } from '@prisma/client';
import { BkashService } from '../payment/payment-service/bkash.service';
import { NagadService } from '../payment/payment-service/nagad.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private bkashService: BkashService,
    private nagadService: NagadService,
    private mailerService: MailerService,
  ) {}

  async createOrder(userId: number, dto: CreateOrderDto) {
    const userAddresses = await this.prisma.address.findMany({
      where: { userId },
    });
    if (!userAddresses || userAddresses.length === 0) {
      throw new BadRequestException('Please add an address before placing an order.');
    }

    const productIds = dto.cartItems.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== dto.cartItems.length)
      throw new BadRequestException('Some products are invalid');

    let totalAmount = 0;
    const orderItemsData = dto.cartItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new BadRequestException(`Product with ID ${item.productId} not found`);
      if (product.stock < item.quantity)
        throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;
      return { productId: item.productId, quantity: item.quantity, price: product.price, subtotal };
    });

    let discountTotal = 0;
    let appliedCoupon: Coupon & { couponUsers?: any[]; couponProducts?: any[] } | null = null;

    if (dto.couponCode) {
      appliedCoupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode },
        include: { couponUsers: true, couponProducts: true },
      });

      if (!appliedCoupon) throw new BadRequestException('Invalid coupon code');

      const now = new Date();
      if (appliedCoupon.startsAt && appliedCoupon.startsAt > now)
        throw new BadRequestException('Coupon not active yet');
      if (appliedCoupon.endsAt && appliedCoupon.endsAt < now)
        throw new BadRequestException('Coupon expired');
      if (appliedCoupon.usageLimit && appliedCoupon.usedCount >= appliedCoupon.usageLimit)
        throw new BadRequestException('Coupon usage limit reached');

      if (appliedCoupon.couponUsers && appliedCoupon.couponUsers.length > 0) {
        const userCoupon = appliedCoupon.couponUsers.find(cu => cu.userId === userId);
        if (!userCoupon) throw new BadRequestException('Coupon not assigned to this user');
      }

      if (appliedCoupon.productId) {
        const isInCart = dto.cartItems.some(item => item.productId === appliedCoupon?.productId);
        if (!isInCart) throw new BadRequestException('Coupon not applicable for products in cart');
      }

      if (appliedCoupon.couponProducts && appliedCoupon.couponProducts.length > 0) {
        const validProductIds = appliedCoupon.couponProducts.map(cp => cp.productId);
        const hasValidProduct = dto.cartItems.some(item => validProductIds.includes(item.productId));
        if (!hasValidProduct)
          throw new BadRequestException('Coupon not applicable for products in cart');
      }

      discountTotal =
        appliedCoupon.type === 'percentage'
          ? totalAmount * (appliedCoupon.value / 100)
          : appliedCoupon.value;

      totalAmount -= discountTotal;

      await this.prisma.coupon.update({
        where: { id: appliedCoupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        totalAmount,
        discountTotal: discountTotal || 0,
        finalAmount: totalAmount,
        couponId: appliedCoupon?.id,
        paymentMethod: dto.paymentMethod,
        items: { create: orderItemsData },
      },
      include: { items: { include: { product: true, }, } },
    });

    let paymentTransactionData: any = {
      orderId: order.id,
      amount: totalAmount,
      status: 'pending',
      provider: dto.paymentMethod as any,
      transactionId: null,
    };

    if (dto.paymentMethod === PaymentMethod.COD) {
      paymentTransactionData.status = 'success';
    } else if (dto.paymentMethod === PaymentMethod.BKASH) {
      const bkashPayment = await this.bkashService.createPayment(order.id, totalAmount);
      paymentTransactionData.transactionId = bkashPayment.paymentID;
    } else if (dto.paymentMethod === PaymentMethod.NAGAD) {
      const nagadPayment = await this.nagadService.createPayment(order.id, totalAmount);
      paymentTransactionData.transactionId = nagadPayment.paymentID;
    }

    await this.prisma.paymentTransaction.create({ data: paymentTransactionData });

    for (const item of dto.cartItems) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new BadRequestException('User not found');
    
    await this.mailerService.sendOrderConfirmationEmail(user.email, user.name, order); 

    return order;
  }

  async getOrdersByUser(
    userId: number,
    status?: string,
    page = 1,
    limit = 10,
    sortBy: 'latest' | 'oldest' | 'highest' | 'lowest' = 'latest',
  ) {
    const skip = (page - 1) * limit;

    const orderBy:
      | { createdAt: 'asc' | 'desc' }
      | { totalAmount: 'asc' | 'desc' } =
      sortBy === 'latest'
        ? { createdAt: 'desc' }
        : sortBy === 'oldest'
        ? { createdAt: 'asc' }
        : sortBy === 'highest'
        ? { totalAmount: 'desc' }
        : { totalAmount: 'asc' };

    return this.prisma.order.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy,
      skip,
      take: limit,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
        Payment: true,
      },
    });
  }

  async getAllOrdersForAdmin(
    page = 1,
    limit = 10,
    status?: string,
    paymentMethod?: string,
    fromDate?: string,
    toDate?: string,
    userId?: number,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (userId) where.userId = userId;

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    return this.prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { 
          select: { 
            name: true, 
            email: true,
            mobile: true,
            addresses: {
              where: { isDefault: true },
              take: 1
            }
          } 
        },
        items: { 
          include: { 
            product: {
              select: { name: true, price: true, images: { take: 1 } }
            } 
          } 
        },
        Payment: true
      }
    });
  }

  async getOrderDetailForAdmin(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { 
          select: { 
            name: true, 
            email: true,
            mobile: true,
            addresses: {
              where: { isDefault: true },
              take: 1
            }
          } 
        },
        items: { 
          include: { 
            product: {
              select: { name: true, price: true, images: { take: 1 } }
            } 
          } 
        },
        Payment: true
      }
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
  
  async updateOrderStatus(orderId: number, status: string) {
    const order = await this.prisma.order.findUnique({ 
      where: { id: orderId },
      include: { items: true, user: true }
    });
    
    if (!order) throw new NotFoundException('Order not found');

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      if (status === 'cancelled' && order.status !== 'cancelled') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.paymentTransaction.updateMany({
          where: { orderId },
          data: { status: 'failed' }
        });
      }

      return updated;
    });

    try {
      await this.mailerService.sendOrderStatusUpdateEmail(
        order.user.email,
        order.user.name,
        status,
        orderId
      );
    } catch (error) {
      console.error('Email failed to send, but order was updated:', error);
    }

    return updatedOrder;
  }

  async deleteOrder(id: number) {
    const order = await this.prisma.order.findUnique({ 
      where: { id },
      include: { items: true }
    });
    
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.delete({ where: { id } });
    });

    return { message: 'Order deleted and stock restored successfully' };
  }

}
