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

  async getVisits(query: { 
    search?: string; 
    city?: string; 
    country?: string; 
    path?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, city, country, path, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(city && { city: { contains: city } }),
      ...(country && { country }),
      ...(path && { path: { contains: path } }),
      ...(search && {
        OR: [
          { ip: { contains: search } },
          { path: { contains: search } },
          { userAgent: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.visitorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.visitorLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      },
    };
  }
}