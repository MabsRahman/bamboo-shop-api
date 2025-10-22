import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class CartReminderService {
  private readonly logger = new Logger(CartReminderService.name);

  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleAbandonedCarts() {
    const now = new Date();

    const carts = await this.prisma.cart.findMany({
      where: { quantity: { gt: 0 } },
      include: { user: true, product: true },
    });

    const cartsByUser: Record<string, any[]> = {};
    for (const cart of carts) {
      if (!cartsByUser[cart.userId]) {
        cartsByUser[cart.userId] = [];
      }
      cartsByUser[cart.userId].push(cart);
    }

    for (const userId in cartsByUser) {
      const userCarts = cartsByUser[userId];
      const user = userCarts[0].user;

      const cartsToRemind = userCarts.filter((cart) => {
        const hoursSinceUpdate =
          (now.getTime() - cart.updatedAt.getTime()) / (1000 * 60 * 60);

        return (
          (hoursSinceUpdate >= 4 && hoursSinceUpdate < 5) ||
          (hoursSinceUpdate >= 24 && hoursSinceUpdate < 25) ||
          (hoursSinceUpdate >= 48 && hoursSinceUpdate < 49)
        );
      });

      if (cartsToRemind.length > 0) {
        await this.sendReminder(user.name, user.email, cartsToRemind);
      }
    }
  }

  private async sendReminder(name: string, email: string, carts: any[]) {
    try {
      await this.mailerService.sendCartReminderEmail(name, email, carts);
      const productNames = carts.map((c) => c.product.name).join(', ');
      this.logger.log(`Cart reminder sent to ${email} for products: ${productNames}`);
    } catch (error) {
      this.logger.error(`Failed to send cart reminder to ${email}: ${error.message}`);
    }
  }
}
