import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class MailerService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  private async compileTemplate(templateName: string, data: any) {
    const filePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const template = await fs.readFile(filePath, 'utf8');
    const compiled = handlebars.compile(template);
    return compiled(data);
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    const appUrl = process.env.APP_URL;
    const verifyUrl = `${appUrl}/auth/verify?token=${token}`;
    const html = await this.compileTemplate('verify-email', { name, verifyUrl });

    await this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Verify your Bamboo Shop account',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const appUrl = process.env.APP_URL;
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
    const html = await this.compileTemplate('reset-password', { name, resetUrl });

    await this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Reset your Bamboo Shop password',
      html,
    });
  }

  async sendOrderConfirmationEmail(email: string, name: string, order: any) {
    const appUrl = process.env.APP_URL;
    const html = await this.compileTemplate('order-confirmation', { name, order, appUrl });
    await this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Your Bamboo Shop Order #${order.id} Confirmation`,
      html,
    });
  }

  async sendReturnRequestReceivedEmail(email: string, name: string, returnRequest: any) {
    const appUrl = process.env.APP_URL;
    const html = await this.compileTemplate('return-request-received', { name, returnRequest, appUrl });

    await this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Return Request Received',
      html,
    });
  }

  async sendCartReminderEmail(name: string, email: string, carts: any[]) {
    const appUrl = process.env.APP_URL;
    const html = await this.compileTemplate('cart-reminder', {
      name,
      cart: { items: carts },
      appUrl,
    });

    await this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Your cart is waiting for you!',
      html,
    });
  }

}
