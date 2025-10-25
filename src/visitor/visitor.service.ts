import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as geoip from 'geoip-lite';

@Injectable()
export class VisitorService {
  constructor(private prisma: PrismaService) {}

  async logVisit(ip: string, userAgent: string, path: string, referrer?: string) {
    const geo = geoip.lookup(ip) || {};
    return this.prisma.visitorLog.create({
      data: {
        ip,
        city: geo.city || null,
        region: geo.region || null,
        country: geo.country || null,
        userAgent,
        path,
        referrer: referrer || null,
      },
    });
  }

  async getVisitsCount() {
    return this.prisma.visitorLog.count();
  }

  async getVisits(filter?: { country?: string; path?: string }) {
    return this.prisma.visitorLog.findMany({
      where: filter || {},
      orderBy: { createdAt: 'desc' },
    });
  }
}
