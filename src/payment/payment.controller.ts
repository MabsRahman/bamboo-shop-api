import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('bkash/callback')
  async handleBkashCallback(@Body() body: any) {
    const { paymentID, status } = body;

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId: paymentID },
    });

    if (!transaction) throw new BadRequestException('Transaction not found');

    await this.prisma.paymentTransaction.update({
      where: { transactionId: paymentID },
      data: { status },
    });

    if (status === 'success') {
      await this.prisma.order.update({
        where: { id: transaction.orderId },
        data: { status: 'paid' },
      });
    }

    return { ok: true };
  }

  @Post('nagad/callback')
  async handleNagadCallback(@Body() body: any) {
    const { paymentID, status } = body;

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId: paymentID },
    });

    if (!transaction) throw new BadRequestException('Transaction not found');

    await this.prisma.paymentTransaction.update({
      where: { transactionId: paymentID },
      data: { status },
    });

    if (status === 'success') {
      await this.prisma.order.update({
        where: { id: transaction.orderId },
        data: { status: 'paid' },
      });
    }

    return { ok: true };
  }
  
}
