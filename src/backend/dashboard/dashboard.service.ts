import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async assertBranchOwner(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: { select: { userId: true } } },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
  }

  async getSummary(userId: number, branchId: number, startDateStr?: string, endDateStr?: string, orderType?: string) {
    if (!branchId) throw new BadRequestException('branchId is required');
    await this.assertBranchOwner(userId, branchId);

    let todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    let yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    if (startDateStr) {
      todayStart = new Date(startDateStr);
      todayStart.setHours(0, 0, 0, 0);
      
      if (endDateStr) {
        todayEnd = new Date(endDateStr);
        todayEnd.setHours(23, 59, 59, 999);
      } else {
        todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);
      }
      
      const duration = todayEnd.getTime() - todayStart.getTime();
      yesterdayEnd = new Date(todayStart.getTime() - 1);
      yesterdayStart = new Date(yesterdayEnd.getTime() - duration);
    }

    const typeFilter = orderType === 'DELIVERY'
      ? { orderType: 'DELIVERY' }
      : orderType === 'DINE_IN'
      ? { orderType: { not: 'DELIVERY' } }
      : {};

    const [todayAgg, yesterdayAgg, topMenus] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          branchId,
          createdAt: { gte: todayStart, lte: todayEnd },
          status: { in: ['COMPLETED', 'PAID'] },
          ...typeFilter,
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          branchId,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          status: { in: ['COMPLETED', 'PAID'] },
          ...typeFilter,
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['name'],
        _sum: { quantity: true },
        where: {
          order: {
            branchId,
            createdAt: { gte: todayStart, lte: todayEnd },
            status: { in: ['COMPLETED', 'PAID'] },
            ...typeFilter,
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

  async getRevenue(userId: number, branchId: number, period: 'daily' | 'weekly' | 'monthly', startDateStr?: string, endDateStr?: string, orderType?: string) {
    if (!branchId) throw new BadRequestException('branchId is required');
    await this.assertBranchOwner(userId, branchId);

    let startDate = new Date();
    let endDate = new Date();

    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      if (endDateStr) {
        endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
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
    }

    const typeFilter = orderType === 'DELIVERY'
      ? { orderType: 'DELIVERY' }
      : orderType === 'DINE_IN'
      ? { orderType: { not: 'DELIVERY' } }
      : {};

    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['COMPLETED', 'PAID'] },
        ...typeFilter,
      },
      select: { totalAmount: true, createdAt: true },
    });

    // Grouping logic based on period or custom date range duration
    const revenueMap = new Map<string, number>();
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    orders.forEach(order => {
      let key = '';
      if (startDateStr) {
        if (diffDays <= 1.5) {
          key = order.createdAt.getHours().toString().padStart(2, '0') + ':00';
        } else if (diffDays <= 7.5) {
          key = order.createdAt.toLocaleDateString('th-TH', { weekday: 'short' });
        } else {
          key = order.createdAt.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
        }
      } else {
        if (period === 'daily') {
          const hour = order.createdAt.getHours().toString().padStart(2, '0') + ':00';
          key = hour;
        } else if (period === 'weekly') {
          key = order.createdAt.toLocaleDateString('th-TH', { weekday: 'short' });
        } else if (period === 'monthly') {
          key = order.createdAt.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
        }
      }
      revenueMap.set(key, (revenueMap.get(key) || 0) + order.totalAmount);
    });

    // Ensure some default labels exist if no data
    if (revenueMap.size === 0) {
      if (startDateStr) {
        if (diffDays <= 1.5) {
          ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].forEach(k => revenueMap.set(k, 0));
        } else if (diffDays <= 7.5) {
          ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].forEach(k => revenueMap.set(k, 0));
        }
      } else {
        if (period === 'daily') {
          ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].forEach(k => revenueMap.set(k, 0));
        } else if (period === 'weekly') {
          ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].forEach(k => revenueMap.set(k, 0));
        }
      }
    }

    const data = Array.from(revenueMap.entries()).map(([label, value]) => ({ label, value }));
    
    // Sort logic (very simple, relying on chronological insertion for weekly/monthly or string sort for daily)
    if (startDateStr ? diffDays <= 1.5 : period === 'daily') {
      data.sort((a, b) => a.label.localeCompare(b.label));
    }
    
    return data;
  }

  async getLogs(userId: number, branchId: number) {
    if (!branchId) throw new BadRequestException('branchId is required');
    await this.assertBranchOwner(userId, branchId);

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

  async getSalesReport(userId: number, branchId: number, filter: 'today' | 'week' | 'month' | '6months' | 'year', startDateStr?: string, endDateStr?: string, orderType?: string) {
    if (!branchId) throw new BadRequestException('branchId is required');
    await this.assertBranchOwner(userId, branchId);

    const now = new Date();
    let currentStart = new Date();
    let currentEnd = new Date(now);
    let prevStart = new Date();
    let prevEnd = new Date();

    const isCustom = !!startDateStr;

    if (isCustom) {
      currentStart = new Date(startDateStr);
      currentStart.setHours(0, 0, 0, 0);
      if (endDateStr) {
        currentEnd = new Date(endDateStr);
        currentEnd.setHours(23, 59, 59, 999);
      } else {
        currentEnd = new Date(currentStart);
        currentEnd.setHours(23, 59, 59, 999);
      }
      const duration = currentEnd.getTime() - currentStart.getTime();
      prevEnd = new Date(currentStart.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - duration);
    } else {
      if (filter === 'today') {
        currentStart.setHours(0, 0, 0, 0);
        currentEnd.setHours(23, 59, 59, 999);
        
        prevStart.setDate(prevStart.getDate() - 1);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(prevEnd.getDate() - 1);
        prevEnd.setHours(23, 59, 59, 999);
      } else if (filter === 'week') {
        currentStart.setDate(currentStart.getDate() - 6);
        currentStart.setHours(0, 0, 0, 0);
        
        prevStart.setDate(currentStart.getDate() - 7);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd = new Date(currentStart);
        prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      } else if (filter === 'month') {
        currentStart.setDate(currentStart.getDate() - 29);
        currentStart.setHours(0, 0, 0, 0);
        
        prevStart.setDate(currentStart.getDate() - 30);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd = new Date(currentStart);
        prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      } else if (filter === '6months') {
        currentStart.setMonth(currentStart.getMonth() - 5);
        currentStart.setDate(1);
        currentStart.setHours(0, 0, 0, 0);
        
        prevStart.setMonth(currentStart.getMonth() - 6);
        prevStart.setDate(1);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd = new Date(currentStart);
        prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      } else if (filter === 'year') {
        currentStart.setMonth(currentStart.getMonth() - 11);
        currentStart.setDate(1);
        currentStart.setHours(0, 0, 0, 0);
        
        prevStart.setMonth(currentStart.getMonth() - 12);
        prevStart.setDate(1);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd = new Date(currentStart);
        prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
      } else {
        throw new BadRequestException('Invalid filter');
      }
    }

    const typeFilter = orderType === 'DELIVERY'
      ? { orderType: 'DELIVERY' }
      : orderType === 'DINE_IN'
      ? { orderType: { not: 'DELIVERY' } }
      : {};

    const [currentOrders, prevAgg, topMenus, deliveryBreakdown] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          branchId,
          createdAt: { gte: currentStart, lte: currentEnd },
          status: { in: ['COMPLETED', 'PAID'] },
          ...typeFilter,
        },
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          branchId,
          createdAt: { gte: prevStart, lte: prevEnd },
          status: { in: ['COMPLETED', 'PAID'] },
          ...typeFilter,
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['name'],
        _sum: { quantity: true },
        where: {
          order: {
            branchId,
            createdAt: { gte: currentStart, lte: currentEnd },
            status: { in: ['COMPLETED', 'PAID'] },
            ...typeFilter,
          },
        },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 1,
      }),
      this.prisma.order.groupBy({
        by: ['deliveryProvider'],
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          branchId,
          createdAt: { gte: currentStart, lte: currentEnd },
          status: { in: ['COMPLETED', 'PAID'] },
          orderType: 'DELIVERY',
        },
      }),
    ]);

    const currentSales = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const currentCount = currentOrders.length;
    const currentAov = currentCount > 0 ? Math.round(currentSales / currentCount) : 0;

    const prevSales = prevAgg._sum.totalAmount || 0;
    const prevCount = prevAgg._count.id || 0;
    const prevAov = prevCount > 0 ? Math.round(prevSales / prevCount) : 0;

    const salesChangePct = prevSales > 0 
      ? ((currentSales - prevSales) / prevSales * 100).toFixed(1) + '%' 
      : '+0%';
    const ordersChangePct = prevCount > 0 
      ? ((currentCount - prevCount) / prevCount * 100).toFixed(1) + '%' 
      : '+0%';
    const aovChangePct = prevAov > 0 
      ? ((currentAov - prevAov) / prevAov * 100).toFixed(1) + '%' 
      : '+0%';

    const salesChange = (currentSales >= prevSales ? '+' : '') + salesChangePct;
    const ordersChange = (currentCount >= prevCount ? '+' : '') + ordersChangePct;
    const aovChange = (currentAov >= prevAov ? '+' : '') + aovChangePct;

    // Grouping for charts & tables
    let chartData: { label: string; value: number; orders: number }[] = [];
    const tableMap = new Map<string, { orders: number; sales: number }>();

    // Decide how to group based on duration
    const diffMs = currentEnd.getTime() - currentStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    let resolvedFilter = filter;
    if (isCustom) {
      if (diffDays <= 1.5) resolvedFilter = 'today';
      else if (diffDays <= 7.5) resolvedFilter = 'week';
      else if (diffDays <= 31.5) resolvedFilter = 'month';
      else resolvedFilter = 'year';
    }

    if (resolvedFilter === 'today') {
      const hourlySlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      chartData = hourlySlots.map(label => ({ label, value: 0, orders: 0 }));
      
      const tablePeriods = [
        { key: '08:00 - 09:59', label: '08:00' },
        { key: '10:00 - 11:59', label: '10:00' },
        { key: '12:00 - 13:59', label: '12:00' },
        { key: '14:00 - 15:59', label: '14:00' },
        { key: '16:00 - 17:59', label: '16:00' },
        { key: '18:00 - 19:59', label: '18:00' },
        { key: '20:00 - 21:59', label: '20:00' },
        { key: '22:00 - 23:59', label: '22:00' },
      ];
      tablePeriods.forEach(p => tableMap.set(p.key, { orders: 0, sales: 0 }));

      currentOrders.forEach(order => {
        const hour = order.createdAt.getHours();
        let slotLabel = '08:00';
        let tableKey = '08:00 - 09:59';
        
        for (let i = 0; i < tablePeriods.length; i++) {
          const startHour = 8 + i * 2;
          if (hour >= startHour && hour < startHour + 2) {
            slotLabel = tablePeriods[i].label;
            tableKey = tablePeriods[i].key;
            break;
          }
          if (hour < 8) {
            slotLabel = '08:00';
            tableKey = '08:00 - 09:59';
          }
          if (hour >= 24) {
            slotLabel = '22:00';
            tableKey = '22:00 - 23:59';
          }
        }

        const chartPoint = chartData.find(d => d.label === slotLabel);
        if (chartPoint) {
          chartPoint.value += order.totalAmount;
          chartPoint.orders += 1;
        }

        const tablePoint = tableMap.get(tableKey) || { orders: 0, sales: 0 };
        tablePoint.sales += order.totalAmount;
        tablePoint.orders += 1;
        tableMap.set(tableKey, tablePoint);
      });
    } else if (resolvedFilter === 'week') {
      const dayNamesTh = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const chartLabels = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
      
      chartData = chartLabels.map(label => ({ label, value: 0, orders: 0 }));
      chartLabels.forEach(day => tableMap.set(`วัน${day}`, { orders: 0, sales: 0 }));
      tableMap.set('วันอาทิตย์', { orders: 0, sales: 0 });

      currentOrders.forEach(order => {
        const dayIndex = order.createdAt.getDay();
        const dayName = dayNamesTh[dayIndex];
        const chartLabel = chartLabels[dayIndex === 0 ? 6 : dayIndex - 1];

        const chartPoint = chartData.find(d => d.label === chartLabel);
        if (chartPoint) {
          chartPoint.value += order.totalAmount;
          chartPoint.orders += 1;
        }

        const tableKey = `วัน${dayName}`;
        const tablePoint = tableMap.get(tableKey) || { orders: 0, sales: 0 };
        tablePoint.sales += order.totalAmount;
        tablePoint.orders += 1;
        tableMap.set(tableKey, tablePoint);
      });
    } else if (resolvedFilter === 'month') {
      chartData = [
        { label: 'สัปดาห์ที่ 1', value: 0, orders: 0 },
        { label: 'สัปดาห์ที่ 2', value: 0, orders: 0 },
        { label: 'สัปดาห์ที่ 3', value: 0, orders: 0 },
        { label: 'สัปดาห์ที่ 4', value: 0, orders: 0 },
      ];
      chartData.forEach(c => tableMap.set(c.label, { orders: 0, sales: 0 }));

      currentOrders.forEach(order => {
        const diffTime = order.createdAt.getTime() - currentStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let weekIndex = Math.floor(diffDays / 7.5);
        if (weekIndex < 0) weekIndex = 0;
        if (weekIndex > 3) weekIndex = 3;

        const label = chartData[weekIndex].label;
        chartData[weekIndex].value += order.totalAmount;
        chartData[weekIndex].orders += 1;

        const tablePoint = tableMap.get(label) || { orders: 0, sales: 0 };
        tablePoint.sales += order.totalAmount;
        tablePoint.orders += 1;
        tableMap.set(label, tablePoint);
      });
    } else {
      // 6months, year, or custom range - group by months
      const temp = new Date(currentStart);
      while (temp <= currentEnd) {
        const label = temp.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        chartData.push({ label, value: 0, orders: 0 });
        tableMap.set(label, { orders: 0, sales: 0 });
        temp.setMonth(temp.getMonth() + 1);
      }

      currentOrders.forEach(order => {
        const label = order.createdAt.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        
        const chartPoint = chartData.find(d => d.label === label);
        if (chartPoint) {
          chartPoint.value += order.totalAmount;
          chartPoint.orders += 1;
        }

        const tablePoint = tableMap.get(label) || { orders: 0, sales: 0 };
        tablePoint.sales += order.totalAmount;
        tablePoint.orders += 1;
        tableMap.set(label, tablePoint);
      });
    }

    const tableData = Array.from(tableMap.entries()).map(([period, data]) => {
      return {
        period,
        orders: data.orders,
        sales: data.sales,
        net: data.sales,
      };
    });

    tableData.reverse();

    let resolvedTitle = '';
    if (isCustom) {
      resolvedTitle = 'ช่วงเวลาที่เลือก';
    } else {
      resolvedTitle = filter === 'today' ? 'วันนี้' : filter === 'week' ? 'สัปดาห์นี้' : filter === 'month' ? 'เดือนนี้' : filter === '6months' ? '6 เดือนที่ผ่านมา' : '1 ปีที่ผ่านมา';
    }

    return {
      title: resolvedTitle,
      summary: {
        totalSales: currentSales,
        salesChange,
        totalOrders: currentCount,
        ordersChange,
        aov: currentAov,
        aovChange,
        topMenu: topMenus.length > 0 ? topMenus[0].name : 'ยังไม่มีข้อมูล',
        topMenuQty: topMenus.length > 0 ? (topMenus[0]._sum.quantity || 0) : 0,
      },
      chartData,
      tableData,
      deliveryBreakdown: deliveryBreakdown.map(db => ({
        provider: db.deliveryProvider || 'UNKNOWN',
        sales: db._sum.totalAmount || 0,
        orders: db._count.id || 0,
      })),
    };
  }
}
