import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';

const TENANT_INCLUDE = {
  user: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  _count: { select: { branches: true } },
  plan: {
    select: { id: true, name: true, price: true, description: true },
  },
} as const;

const TRANSACTION_INCLUDE = {
  brand: {
    select: {
      id: true,
      name: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  },
  plan: { select: { id: true, name: true, price: true } },
} as const;

@Injectable()
export class SuperAdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ── Tenant management ────────────────────────────────────────────────────────

  findAllTenants() {
    return this.prisma.brand.findMany({
      include: TENANT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTenantPlan(id: number, dto: UpdateTenantPlanDto) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('ไม่พบร้านค้านี้');
    return this.prisma.brand.update({
      where: { id },
      data: { planId: dto.planId ?? null },
      include: TENANT_INCLUDE,
    });
  }

  async updateTenantStatus(id: number, dto: UpdateTenantStatusDto) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('ไม่พบร้านค้านี้');
    return this.prisma.brand.update({
      where: { id },
      data: { status: dto.status },
      include: TENANT_INCLUDE,
    });
  }

  // ── Dashboard stats ──────────────────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      totalTenants,
      totalBranches,
      activeBrandsWithPlan,
      approvedTxnsAll,
      recentBrandDates,
      approvedTxnsRecent,
      recentTenantRecords,
    ] = await Promise.all([
      this.prisma.brand.count({ where: { status: 'ACTIVE' } }),
      this.prisma.branch.count({ where: { brand: { status: 'ACTIVE' } } }),
      this.prisma.brand.findMany({
        where: { status: 'ACTIVE', planId: { not: null } },
        select: { plan: { select: { price: true } } },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { status: 'APPROVED' },
        include: { plan: { select: { price: true } } },
      }),
      this.prisma.brand.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { status: 'APPROVED', createdAt: { gte: sixMonthsAgo } },
        include: { plan: { select: { price: true } } },
      }),
      this.prisma.brand.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          plan: { select: { name: true } },
          _count: { select: { branches: true } },
        },
      }),
    ]);

    // MRR — sum of plan.price for every ACTIVE brand with a plan
    const mrr = activeBrandsWithPlan.reduce((s, b) => s + (b.plan?.price ?? 0), 0);

    // Total Revenue — prefer the amount captured at purchase time so editing a
    // plan's price later cannot rewrite historical revenue. Legacy rows written
    // before `amount` existed fall back to the plan's current price.
    const totalRevenue = approvedTxnsAll.reduce(
      (s, t) => s + (t.amount ?? t.plan?.price ?? 0), 0,
    );

    // New Tenants Chart — group by day over the last 7 days
    const dayCountMap = new Map<string, number>();
    for (const b of recentBrandDates) {
      const key = b.createdAt.toISOString().split('T')[0];
      dayCountMap.set(key, (dayCountMap.get(key) ?? 0) + 1);
    }
    const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const newTenantsChart = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      return { label: THAI_DAYS[d.getDay()], value: dayCountMap.get(key) ?? 0 };
    });

    // Revenue Chart — sum approved plan prices per month for 6 months
    const monthRevenueMap = new Map<string, number>();
    for (const t of approvedTxnsRecent) {
      const d = t.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthRevenueMap.set(key, (monthRevenueMap.get(key) ?? 0) + (t.amount ?? t.plan?.price ?? 0));
    }
    const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const revenueChart = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { label: THAI_MONTHS[d.getMonth()], value: monthRevenueMap.get(key) ?? 0 };
    });

    return {
      totalTenants,
      totalBranches,
      mrr,
      totalRevenue,
      newTenantsChart,
      revenueChart,
      recentTenants: recentTenantRecords.map(t => ({
        id: t.id,
        brandName: t.name,
        plan: t.plan?.name ?? '-',
        branches: t._count.branches,
        status: t.status as string,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  // ── Billing / payment transactions ───────────────────────────────────────────

  getBillingTransactions() {
    return this.prisma.paymentTransaction.findMany({
      include: TRANSACTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveTransaction(id: number) {
    const txn = await this.prisma.paymentTransaction.findUnique({ where: { id } });
    if (!txn) throw new NotFoundException('ไม่พบรายการนี้');

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await this.prisma.$transaction([
      this.prisma.paymentTransaction.update({
        where: { id },
        data: { status: 'APPROVED' },
      }),
      this.prisma.brand.update({
        where: { id: txn.brandId },
        data: { status: 'ACTIVE', planId: txn.planId, planExpiresAt: expiresAt },
      }),
    ]);

    return { message: 'อนุมัติสำเร็จ อัปเกรดแพ็กเกจเรียบร้อย' };
  }

  async rejectTransaction(id: number, note?: string) {
    const txn = await this.prisma.paymentTransaction.findUnique({ where: { id } });
    if (!txn) throw new NotFoundException('ไม่พบรายการนี้');

    return this.prisma.paymentTransaction.update({
      where: { id },
      data: { status: 'REJECTED', note: note ?? null },
      include: TRANSACTION_INCLUDE,
    });
  }
}
