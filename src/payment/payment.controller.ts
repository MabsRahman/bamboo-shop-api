import { Controller, Post, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  create(@Body() body: any) {
    return this.paymentService.createPayment(body);
  }

  @Post('verify')
  verify(@Body() body: { transactionId: string; orderId: number }) {
    return this.paymentService.verifyPayment(body.transactionId, body.orderId);
  }

  @Post('webhook')
  async webhook(@Body() payload: any) {
    return this.paymentService.handleWebhook(payload);
  }
}