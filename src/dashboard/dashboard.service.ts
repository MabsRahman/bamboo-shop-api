import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [orderStats, totalUsers, todayVisitors, recentOrders, lowStockProducts] = await Promise.all([
      // 1. Revenue & Order Counts
      this.prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // 2. Total Registered Users
      this.prisma.user.count(),

      // 3. Traffic for today (Changed 'timestamp' to 'createdAt')
      this.prisma.visitorLog.count({
        where: {
          createdAt: { gte: todayStart },
        },
      }),

      // 4. Recent activity
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }),

      // 5. Inventory Alert
      this.prisma.product.findMany({
        where: { stock: { lt: 3 } },
        select: { name: true, stock: true },
        take: 5
      })
    ]);

    return {
      cards: {
        totalRevenue: orderStats._sum.totalAmount || 0,
        totalOrders: orderStats._count.id,
        totalUsers: totalUsers,
        todayVisitors: todayVisitors,
      },
      recentOrders,
      alerts: {
        lowStock: lowStockProducts
      }
    };
  }
}