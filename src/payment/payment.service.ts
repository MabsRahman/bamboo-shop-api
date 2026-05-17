import axios from 'axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class PaymentService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly prisma: PrismaService, private mailerService: MailerService,) {
    this.baseUrl = process.env.UDDOKTAPAY_CHECKOUT_V2_URL || '';
    this.apiKey = process.env.UDDOKTAPAY_API_KEY || '';

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Missing UddoktaPay environment variables');
    }
  }

  async createPayment(order: {
    id: string;
    amount: number;
    name: string;
    email?: string;
  }) {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          currency: "BDT",
          amount: order.amount,
          orderId: order.id,
          customerName: order.name,
          email: "test@exmaple.com",

          redirect_url: 'http://localhost:3001/orders/success',
          cancel_url: 'http://localhost:3001/orders/cancel',
          webhook_url: 'http://localhost:3000/payment/webhook',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error: any) {
      console.error('Payment Error:', error.response?.data || error.message);
      throw new InternalServerErrorException('Payment creation failed');
    }
  }

  async verifyPayment(transactionId: string, orderId: number) {
    try {
      const response = await axios.post(
        process.env.UDDOKTAPAY_VERIFY_URL!,
        { transactionId },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      const result = response.data;

      console.log('VERIFY RESULT:', result);

      if (result.status === 'success') {
        const existingTransaction =
          await this.prisma.paymentTransaction.findFirst({
            where: { orderId },
          });

        if (existingTransaction?.status === 'success') {
          return result;
        }

        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            user: true,
          },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        const gatewayMethod =
          result.payment_method ||
          result.method ||
          result.gateway ||
          result.paymentMethod ||
          null;

        let updatedPaymentMethod = order.paymentMethod;

        if (gatewayMethod) {
          const normalized = String(gatewayMethod).toUpperCase();

          if (normalized.includes('BKASH')) {
            updatedPaymentMethod = 'BKASH';
          } else if (normalized.includes('NAGAD')) {
            updatedPaymentMethod = 'NAGAD';
          }
        }

        await this.prisma.paymentTransaction.updateMany({
          where: { orderId },
          data: {
            status: 'success',
            transactionId,
            provider: updatedPaymentMethod as any,
          },
        });

        // Update order
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'paid',
            paymentMethod: updatedPaymentMethod as any,
          },
        });

        // Decrease stock
        for (const item of order.items) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        if (order.user?.email) {
          await this.mailerService.sendOrderConfirmationEmail(
            order.user.email,
            order.shippingName ?? 'Customer',
            order,
          );
        }
      }

      return result;
    } catch (error: any) {
      console.error(
        'Verify Error:',
        error.response?.data || error.message,
      );

      throw new InternalServerErrorException(
        'Payment verification failed',
      );
    }
  }

  async handleWebhook(payload: any) {
    const { transactionId, orderId, status } = payload;

    if (status === 'success') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      });

      await this.prisma.paymentTransaction.updateMany({
        where: { orderId },
        data: { status: 'success' },
      });
    }

    return { ok: true };
  }

}