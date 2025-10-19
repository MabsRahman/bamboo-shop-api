import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class BkashService {
  private baseUrl = 'https://api.bkash.com';
  private username = process.env.BKASH_USERNAME!;
  private password = process.env.BKASH_PASSWORD!;
  private appKey = process.env.BKASH_APP_KEY!;
  private appSecret = process.env.BKASH_APP_SECRET!;

  async createPayment(orderId: number, amount: number) {
    const tokenRes = await axios.post(`${this.baseUrl}/token/grant`, {
      app_key: this.appKey,
      app_secret: this.appSecret,
    }, { auth: { username: this.username, password: this.password } });

    const accessToken = tokenRes.data.id_token;

    const paymentRes = await axios.post(`${this.baseUrl}/payment/create`, {
      amount,
      orderId,
      currency: 'BDT',
      intent: 'sale',
    }, { headers: { Authorization: accessToken } });

    return paymentRes.data;
  }
}
