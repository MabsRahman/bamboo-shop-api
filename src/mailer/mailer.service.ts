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

    handlebars.registerHelper('eq', (a, b) => a === b);
  }

  private async compileTemplate(templateName: string, data: any) {
    const filePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const template = await fs.readFile(filePath, 'utf8');
    const compiled = handlebars.compile(template);
    return compiled(data);
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    const appUrl = process.env.APP_URL;
    const verifyUrl = `${appUrl}/verify?token=${token}`;
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
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
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

  async sendOrderStatusUpdateEmail(email: string, name: string, status: string, orderId: number) {
    const appUrl = process.env.APP_URL;
    const html = await this.compileTemplate('order-status-update', { 
      name, 
      status, 
      orderId, 
      appUrl 
    });

    await this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Update on your Bamboo Shop Order #${orderId}`,
      html,
    });
  }

  async sendReturnStatusUpdateEmail(email: string, name: string, status: string, returnId: number) {
    const appUrl = process.env.APP_URL;
    const html = await this.compileTemplate('return-status-update', { 
      name, 
      status, 
      returnId, 
      appUrl 
    });

    await this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Update on your Return Request #${returnId}`,
      html,
    });
  }

  async sendContactReplyEmail(email: string, name: string, subject: string, originalMessage: string, replyContent: string) {
    const html = await this.compileTemplate('contact-reply', { 
      name, 
      subject, 
      originalMessage, 
      replyContent 
    });

    await this.transporter.sendMail({
      from: `"Bamboo Shop Support" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Re: ${subject}`,
      html,
    });
  }

  async sendCouponGiftEmail(
    email: string, 
    name: string, 
    couponCode: string, 
    value: number, 
    type: string, 
    message: string
  ) {
    const appUrl = process.env.APP_URL;
    const discountText = type === 'percentage' ? `${value}%` : `${value} BDT`;
    
    const html = await this.compileTemplate('coupon-gift', { 
      name, 
      couponCode, 
      discountText, 
      message,
      appUrl 
    });

    await this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'A Special Gift for You! 🎁',
      html,
    });
  }

  async sendBulkNotification(email: string, name: string, subject: string, message: string) {
    const html = await this.compileTemplate('bulk-announcement', {
      name,
      message,
      email,
      appUrl: process.env.APP_URL,
    });

    return this.transporter.sendMail({
      from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
      to: email,
      subject: subject,
      html,
    });
  }

  async sendInvoiceEmail(email: string, name: string, order: any, pdfBuffer: Buffer) {
    try {
      const appUrl = process.env.APP_URL;

      const html = await this.compileTemplate('shipping-confirmation', { 
        name, 
        order, 
        appUrl 
      });

      await this.transporter.sendMail({
        from: `"Bamboo Shop" <${process.env.MAIL_USER}>`,
        to: email,
        subject: `Order Shipped! Invoice for #${order.id}`,
        html,
        attachments: [
          {
            filename: `Invoice_${order.id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ],
      });
      
      console.log(`Shipping email with invoice sent to ${email}`);
    } catch (error) {
      console.error('Failed to send invoice email:', error);
    }
  }
}
