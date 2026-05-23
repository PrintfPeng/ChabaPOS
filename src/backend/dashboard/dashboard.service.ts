import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSummary(branchId: number) {
    if (!branchId) throw new BadRequestException('branchId is required');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [todayAgg, yesterdayAgg, topMenus] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          branchId,
          createdAt: { gte: todayStart },
          status: { in: ['COMPLETED', 'PAID'] },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          branchId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
          status: { in: ['COMPLETED', 'PAID'] },
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['name'],
        _sum: { quantity: true },
        where: {
          order: {
            branchId,
            createdAt: { gte: todayStart },
            status: { in: ['COMPLETED', 'PAID'] },
          },
        },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const todaySales = todayAgg._sum.totalAmount || 0;
    const todayOrders = todayAgg._count.id || 0;
    
    const yesterdaySales = yesterdayAgg._sum.totalAmount || 0;
    const yesterdayOrders = yesterdayAgg._count.id || 0;

    const salesIncrease = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(1) + '%' 
      : '+0%';
      
    const orderIncrease = yesterdayOrders > 0 
      ? ((todayOrders - yesterdayOrders) / yesterdayOrders * 100).toFixed(1) + '%' 
      : '+0%';

    return {
      todaySales,
      orderCount: todayOrders,
      topMenu: topMenus.length > 0 ? topMenus[0].name : 'ยังไม่มีข้อมูล',
      salesIncrease: (todaySales >= yesterdaySales ? '+' : '') + salesIncrease,
      orderIncrease: (todayOrders >= yesterdayOrders ? '+' : '') + orderIncrease,
      topMenus: topMenus.map(m => ({ name: m.name, quantity: m._sum.quantity })),
    };
  }

  async getRevenue(branchId: number, period: 'daily' | 'weekly' | 'monthly') {
    if (!branchId) throw new BadRequestException('branchId is required');

    const now = new Date();
    let startDate = new Date();

    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      throw new BadRequestException('Invalid period');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        createdAt: { gte: startDate, lte: now },
        status: { in: ['COMPLETED', 'PAID'] },
      },
      select: { totalAmount: true, createdAt: true },
    });

    // Grouping logic based on period
    const revenueMap = new Map<string, number>();

    orders.forEach(order => {
      let key = '';
      if (period === 'daily') {
        const hour = order.createdAt.getHours().toString().padStart(2, '0') + ':00';
        key = hour;
      } else if (period === 'weekly') {
        key = order.createdAt.toLocaleDateString('th-TH', { weekday: 'short' });
      } else if (period === 'monthly') {
        key = order.createdAt.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      }
      revenueMap.set(key, (revenueMap.get(key) || 0) + order.totalAmount);
    });

    // Ensure some default labels exist if no data
    if (revenueMap.size === 0) {
      if (period === 'daily') {
        ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].forEach(k => revenueMap.set(k, 0));
      } else if (period === 'weekly') {
        ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].forEach(k => revenueMap.set(k, 0));
      }
    }

    const data = Array.from(revenueMap.entries()).map(([label, value]) => ({ label, value }));
    
    // Sort logic (very simple, relying on chronological insertion for weekly/monthly or string sort for daily)
    if (period === 'daily') {
      data.sort((a, b) => a.label.localeCompare(b.label));
    }
    
    return data;
  }

  async getLogs(branchId: number) {
    if (!branchId) throw new BadRequestException('branchId is required');

    const logs = await this.prisma.activityLog.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return logs.map(log => {
      // Calculate time ago
      const diffMs = new Date().getTime() - log.createdAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let timeAgo = '';
      if (diffDays > 0) timeAgo = `${diffDays} วันที่แล้ว`;
      else if (diffHours > 0) timeAgo = `${diffHours} ชั่วโมงที่แล้ว`;
      else if (diffMins > 0) timeAgo = `${diffMins} นาทีที่แล้ว`;
      else timeAgo = 'เมื่อสักครู่';

      return {
        id: log.id,
        action: log.action,
        user: `${log.user.firstName} ${log.user.lastName}`,
        time: timeAgo,
        role: 'Admin', // Static for now unless user role is in DB
        details: log.details,
      };
    });
  }
}
