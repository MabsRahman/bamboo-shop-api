import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Coupon, PaymentMethod } from '@prisma/client';
import { BkashService } from '../payment/payment-service/bkash.service';
import { NagadService } from '../payment/payment-service/nagad.service';
import { MailerService } from '../mailer/mailer.service';
import PDFDocument from 'pdfkit';
import { join } from 'path/win32';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { timestamp } from 'rxjs/internal/operators/timestamp';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private bkashService: BkashService,
    private nagadService: NagadService,
    private mailerService: MailerService,
  ) {}

  
  async createOrder(userId: number, dto: CreateOrderDto) {
    // 1. Check if the user has any profile address recorded yet
    const userAddresses = await this.prisma.address.findMany({
      where: { userId },
    });
    
    // If they have absolutely zero addresses saved on their account profile,
    // let's automatically save this checkout address as their default profile address for next time.
    if (!userAddresses || userAddresses.length === 0) {
      await this.prisma.address.create({
        data: {
          userId,
          street: dto.street,
          houseno: dto.houseno,
          city: dto.city,
          postalCode: dto.postalCode,
          isDefault: true,
        }
      });
    }

    // 2. Fetch products and check stock limits
    const productIds = dto.cartItems.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        discounts: {
          where: {
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
          take: 1,
        },
      },
    });
    
    if (products.length !== dto.cartItems.length) {
      throw new BadRequestException('Some products are invalid');
    }

    let subtotalAmount = 0;
    const orderItemsData = dto.cartItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new BadRequestException(`Product with ID ${item.productId} not found`);
      if (product.stock < item.quantity)
        throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
      
      let activePrice = product.price;
      const activeDiscount = product.discounts?.[0];

      if (activeDiscount) {
        if (activeDiscount.type === 'percentage') {
          activePrice = product.price * (1 - activeDiscount.value / 100);
        } else if (activeDiscount.type === 'fixed') {
          activePrice = Math.max(0, product.price - activeDiscount.value);
        }
        activePrice = Math.round(activePrice * 100) / 100;
      }
      
      const subtotal = activePrice * item.quantity;
      subtotalAmount += subtotal;

      return { productId: item.productId, quantity: item.quantity, price: activePrice, subtotal };
    });

    // 3. Process Coupon Logic
    let discountTotal = 0;
    let appliedCoupon: any = null;

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

      if (appliedCoupon.couponUsers?.length > 0) {
        const userCoupon = appliedCoupon.couponUsers.find(cu => cu.userId === userId);
        if (!userCoupon) throw new BadRequestException('Coupon not assigned to this user');
      }

      if (appliedCoupon.productId) {
        const isInCart = dto.cartItems.some(item => item.productId === appliedCoupon?.productId);
        if (!isInCart) throw new BadRequestException('Coupon not applicable for products in cart');
      }

      if (appliedCoupon.couponProducts?.length > 0) {
        const validProductIds = appliedCoupon.couponProducts.map(cp => cp.productId);
        const hasValidProduct = dto.cartItems.some(item => validProductIds.includes(item.productId));
        if (!hasValidProduct) throw new BadRequestException('Coupon not applicable for products in cart');
      }

      const rawDiscount = appliedCoupon.type === 'percentage'
        ? subtotalAmount * (appliedCoupon.value / 100)
        : appliedCoupon.value;

      discountTotal = Math.round(rawDiscount * 100) / 100;

      await this.prisma.coupon.update({
        where: { id: appliedCoupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    const baseItemsTotal = Math.round((subtotalAmount - discountTotal) * 100) / 100;
    const incomingShippingCost = Number(dto.shippingCost || 200); 
    const finalAmount = Math.round((baseItemsTotal + incomingShippingCost) * 100) / 100;
    const roundedSubtotal = Math.round(subtotalAmount * 100) / 100;

    // 4. Create the Order with the exact chosen Address Snapshot
    const order = await this.prisma.order.create({
      data: {
        userId,
        totalAmount: roundedSubtotal,
        discountTotal: discountTotal,
        shippingCost: incomingShippingCost,
        finalAmount: finalAmount,
        couponId: appliedCoupon?.id || null,
        paymentMethod: dto.paymentMethod,
        items: { create: orderItemsData },
        
        // Added safe default fallback guards to prevent P2011 null constraint errors
        shippingName: dto.name || 'Customer',
        shippingPhone: dto.phone || '01000000000',
        shippingAddress: `${dto.houseno || ''}, ${dto.street || ''}, ${dto.city || ''} - ${dto.postalCode || ''}`.trim()
      },
      include: { items: { include: { product: true } } },
    });

    // 5. Create Payment Transaction
    let paymentTransactionData: any = {
      orderId: order.id,
      amount: finalAmount,
      status: 'pending',
      provider: dto.paymentMethod as any,
      transactionId: null,
    };

    if (dto.paymentMethod === PaymentMethod.COD) {
      paymentTransactionData.status = 'success';
    } else if (dto.paymentMethod === PaymentMethod.BKASH) {
      const bkashPayment = await this.bkashService.createPayment(order.id, finalAmount);
      paymentTransactionData.transactionId = bkashPayment.paymentID;
    } else if (dto.paymentMethod === PaymentMethod.NAGAD) {
      const nagadPayment = await this.nagadService.createPayment(order.id, finalAmount);
      paymentTransactionData.transactionId = nagadPayment.paymentID;
    }

    await this.prisma.paymentTransaction.create({ data: paymentTransactionData });

    // 6. Update Product Stocks
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
    
    // 7. Send the email with the snapshot shipping values
    await this.mailerService.sendOrderConfirmationEmail(user.email, dto.name, order); 

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
      const cleanSearch = search.trim();
      const numericValue = Number(cleanSearch);

      if (!isNaN(numericValue) && cleanSearch !== '') {
        where.id = numericValue;
      } else {
        where.OR = [
          { shippingName: { contains: cleanSearch } },
          { shippingAddress: { contains: cleanSearch } },
          {
            user: {
              OR: [
                { name: { contains: cleanSearch } },
                { email: { contains: cleanSearch } }
              ]
            }
          }
        ];
      }
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

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
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
          Payment: true,
          Invoice: true
        }
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
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
        Payment: true,
        Invoice: true

      }
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
  
  async updateOrderStatus(orderId: number, status: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: { include: { product: true } }, 
        user: { 
          include: { 
            addresses: { where: { isDefault: true }, take: 1 } 
          } 
        } 
      }
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
      if (status === 'shipped') {
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
          (now.getMonth() + 1).toString().padStart(2, '0') +
          now.getDate().toString().padStart(2, '0') +
          now.getHours().toString().padStart(2, '0') +
          now.getMinutes().toString().padStart(2, '0');
        const invoiceNumber = `INV-${order.id}-${timestamp}`;

        const pdfBuffer = await this.generateInvoiceBuffer(order, invoiceNumber);
        
        const fileName = `invoice_${order.id}_${timestamp}.pdf`;
        const uploadDir = join(process.cwd(), 'uploads', 'invoices');
        
        if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
        writeFileSync(join(uploadDir, fileName), pdfBuffer);

        await this.prisma.invoice.upsert({
          where: { orderId: order.id },
          update: { 
            pdfPath: fileName,
            invoiceNumber: invoiceNumber
          },
          create: {
            orderId: order.id,
            invoiceNumber: invoiceNumber,
            pdfPath: fileName
          }
        });
        await this.mailerService.sendInvoiceEmail(order.user.email, order.user.name, order, pdfBuffer);
    }
      
      else {
        await this.mailerService.sendOrderStatusUpdateEmail(
          order.user.email,
          order.user.name,
          status,
          orderId
        );
      }
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


  async generateInvoiceBuffer(order: any, invoiceNumber: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fillColor('#2b7a0b').fontSize(22).text('BAMBOO SHOP', 50, 50, { characterSpacing: 1 });
      doc.fillColor('#666666').fontSize(9).text('SUSTAINABLE QUALITY FURNITURE', 50, 75);
      
      doc.fillColor('#000000').fontSize(20).text('INVOICE', 0, 50, { align: 'right' });
      const invNo = order.Invoice?.invoiceNumber || invoiceNumber;
      doc.fontSize(9).text(`Invoice: #${invNo}`, 0, 75, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 0, 87, { align: 'right' });

      doc.moveDown(3);
      const topSectionY = doc.y;

      const address = order.user.addresses?.[0];
      
      doc.fillColor('#2b7a0b').fontSize(10).text('BILL TO:', 50, topSectionY);
      doc.fillColor('#000000').fontSize(11).text(order.user.name, 50, topSectionY + 15);
      
      if (address) {
        doc.fontSize(9).fillColor('#444444')
          .text(`${address.houseno}, ${address.street}`, 50, topSectionY + 30)
          .text(`${address.city}, ${address.state} - ${address.postalCode}`, 50, topSectionY + 42)
          .text(address.country, 50, topSectionY + 54);
        
        doc.fontSize(9).text(order.user.email, 50, topSectionY + 70);
      } else {
        doc.fontSize(10).fillColor('#444444').text(order.user.email, 50, topSectionY + 30);
      }
      
      const lineY = address ? topSectionY + 90 : topSectionY + 60;
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, lineY).lineTo(550, lineY).stroke();

      doc.moveDown(address ? 6 : 4);

      const tableTop = doc.y;
      doc.fillColor('#f9f9f9').rect(50, tableTop, 500, 25).fill();
      
      doc.fillColor('#2b7a0b').fontSize(10);
      doc.text('PRODUCT DESCRIPTION', 60, tableTop + 8);
      doc.text('QTY', 350, tableTop + 8, { width: 30, align: 'center' });
      doc.text('UNIT PRICE', 400, tableTop + 8, { width: 60, align: 'right' });
      doc.text('TOTAL', 480, tableTop + 8, { width: 70, align: 'right' });

      let currentY = tableTop + 35;
      doc.fillColor('#000000').fontSize(10);

      order.items.forEach((item) => {
        const itemTotal = item.quantity * Number(item.price);
        
        doc.text(item.product?.name || 'Bamboo Furniture', 60, currentY);
        doc.text(item.quantity.toString(), 350, currentY, { width: 30, align: 'center' });
        doc.text(`TK ${Number(item.price).toLocaleString()}`, 400, currentY, { width: 60, align: 'right' });
        doc.text(`TK ${itemTotal.toLocaleString()}`, 480, currentY, { width: 70, align: 'right' });

        doc.strokeColor('#f0f0f0').moveTo(50, currentY + 15).lineTo(550, currentY + 15).stroke();
        currentY += 25;
      });

      doc.moveDown(2);
      const summaryY = doc.y > 650 ? 650 : doc.y + 20;

      doc.fillColor('#2b7a0b').fontSize(14).text(`GRAND TOTAL:`, 350, summaryY);
      doc.fillColor('#000000').fontSize(16).text(`TK ${Number(order.totalAmount).toLocaleString()}`, 480, summaryY, { width: 70, align: 'right' });

      doc.fontSize(8).fillColor('#999999').text(
        'Thank you for supporting sustainable bamboo furniture. Please keep this invoice for your records.',
        50, 780, { align: 'center', width: 500 }
      );

      doc.end();
    });
  }

}
