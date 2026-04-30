import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async broadcastToSubscribers(subject: string, message: string) {
    const campaign = await this.prisma.newsletterCampaign.create({
      data: {
        subject,
        message,
        status: 'SENDING',
      },
    });

    const subscribers = await this.prisma.user.findMany({
      where: { isSubscribed: true },
      select: { email: true, name: true },
    });

    this.runBackgroundBatch(subscribers, subject, message, campaign.id);

    return { 
      campaignId: campaign.id, 
      totalSubscribers: subscribers.length, 
      status: 'Processing' 
    };
  }

  private async runBackgroundBatch(users: any[], subject: string, message: string, campaignId: number) {
    let successCount = 0;

    for (const user of users) {
      try {
        await this.mailerService.sendBulkNotification(user.email, user.name, subject, message);
        successCount++;
        
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        this.logger.error(`Failed to send to ${user.email}: ${error.message}`);
      }
    }

    await this.prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: { 
        status: 'COMPLETED',
        totalSent: successCount,
        sentAt: new Date()
      },
    });

    this.logger.log(`Campaign ${campaignId} completed. Sent to ${successCount} users.`);
  }

  async getCampaignHistory() {
    return this.prisma.newsletterCampaign.findMany({
      orderBy: { sentAt: 'desc' },
    });
  }

  async unsubscribeUser(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return { message: 'Email not found.' };
    }

    await this.prisma.user.update({
      where: { email },
      data: { isSubscribed: false },
    });

    return { message: 'You have been successfully unsubscribed.' };
  }

  async subscribeUser(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'User not found.' };
    }

    await this.prisma.user.update({
      where: { email },
      data: { isSubscribed: true },
    });

    return { message: 'Welcome back! You are now re-subscribed.' };
  }
}