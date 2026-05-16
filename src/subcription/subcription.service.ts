import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class SubcriptionService {
  private readonly logger = new Logger(SubcriptionService.name);

  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async subscribe(email: string) {
    if (!email) throw new BadRequestException('Email is required');

    const existing = await this.prisma.emailSubscribe.findUnique({
      where: { email },
    });

    if (existing) {
      if (!existing.isActive) {
        await this.prisma.emailSubscribe.update({
          where: { email },
          data: { isActive: true },
        });
      }
      return true;
    }

    await this.prisma.emailSubscribe.create({
      data: { email, isActive: true },
    });

    return true;
  }

  async unsubscribe(email: string) {
    if (!email) throw new BadRequestException('Email is required');

    const existing = await this.prisma.emailSubscribe.findUnique({
      where: { email },
    });

    if (!existing) return true;

    await this.prisma.emailSubscribe.update({
      where: { email },
      data: { isActive: false },
    });

    return true;
  }

  async findAllSubscribers(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [subscribers, total] = await Promise.all([
      this.prisma.emailSubscribe.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailSubscribe.count(),
    ]);

    return { subscribers, total, page, lastPage: Math.ceil(total / limit) };
  }

  async broadcastToGuests(subject: string, message: string) {
    const campaign = await this.prisma.guestNewsletterCampaign.create({
      data: {
        subject,
        message,
        status: 'SENDING',
      },
    });

    const activeGuests = await this.prisma.emailSubscribe.findMany({
      where: { isActive: true },
      select: { email: true },
    });

    this.runGuestBackgroundBatch(activeGuests, subject, message, campaign.id);

    return {
      campaignId: campaign.id,
      totalSubscribers: activeGuests.length,
      status: 'Processing',
    };
  }

  private async runGuestBackgroundBatch(guests: any[], subject: string, message: string, campaignId: number) {
    let successCount = 0;

    for (const guest of guests) {
      try {
        await this.mailerService.sendGuestBulkNotification(guest.email, subject, message);
        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        this.logger.error(`Failed sending to guest ${guest.email}: ${error.message}`);
      }
    }

    await this.prisma.guestNewsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        totalSent: successCount,
        sentAt: new Date(),
      },
    });
  }

  async getGuestCampaignHistory() {
    return this.prisma.guestNewsletterCampaign.findMany({
      orderBy: { sentAt: 'desc' },
    });
  }
}