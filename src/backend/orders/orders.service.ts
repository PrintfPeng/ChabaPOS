import {
  Injectable, Inject, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TableAccessService } from '../common/table-access.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAtTableDto } from './dto/create-order-at-table.dto';
import { ShiftsService } from '../shifts/shifts.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(PrismaService)      private readonly prisma:       PrismaService,
    @Inject(TableAccessService) private readonly tableAccess:  TableAccessService,
    @Inject(PromotionsService)  private readonly promotions:   PromotionsService,
    @Inject(ShiftsService)      private readonly shifts:       ShiftsService,
  ) {
    this.logger.log('OrdersService initialized');
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async assertBranchOwner(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { brand: { select: { userId: true } } },
    });
    if (!branch || branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
    }
  }

  /**
   * FIX L1: Applies delivery-platform prices when deliveryPlatformId is given.
   * Prices are always derived server-side; client can never name its own price.
   */
  private async priceItems(
    branchId: number,
    items: CreateOrderDto['items'],
    deliveryPlatformId?: number,
  ) {
    const menuItemIds  = items.map(i => i.menuItemId);
    const allOptionIds = items.flatMap(i => i.options?.map(o => o.optionId) ?? []);

    const [menuItems, options, deliveryPrices] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, branchId },
        include: { kitchen: true },
      }),
      allOptionIds.length > 0
        ? this.prisma.option.findMany({
            where: { id: { in: allOptionIds }, optionGroup: { branchId } },
          })
        : Promise.resolve([]),
      // L1: fetch per-platform prices only when order is Delivery
      deliveryPlatformId
        ? this.prisma.menuDeliveryPrice.findMany({
            where: { deliveryPlatformId, menuItemId: { in: menuItemIds } },
          })
        : Promise.resolve([]),
    ]);

    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    const optMap  = new Map(options.map(o => [o.id, o]));
    const dpMap   = new Map(deliveryPrices.map(dp => [dp.menuItemId, dp.price]));

    let totalAmount = 0;
    const orderItemsData: any[] = [];

    for (const itemDto of items) {
      const menuItem = menuMap.get(itemDto.menuItemId);
      if (!menuItem) throw new NotFoundException(`Menu item ${itemDto.menuItemId} not found in this branch`);

      // L1: use delivery price if available, fall back to base price
      const basePrice = dpMap.has(menuItem.id) ? dpMap.get(menuItem.id)! : menuItem.price;
      let itemPrice   = basePrice;
      const optionsData: any[] = [];

      if (itemDto.options) {
        for (const optDto of itemDto.options) {
          const option = optMap.get(optDto.optionId);
          if (!option) throw new NotFoundException(`Option ${optDto.optionId} not found in this branch`);
          itemPrice += option.price;
          optionsData.push({ optionId: option.id, name: option.name, price: option.price });
        }
      }

      totalAmount += itemPrice * itemDto.quantity;
      orderItemsData.push({
        menuItemId: menuItem.id,
        name:       menuItem.name,
        price:      basePrice,           // snapshot of the actual price charged
        quantity:   itemDto.quantity,
        notes:      itemDto.notes || null,
        kitchenId:  menuItem.kitchenId,
        options:    { create: optionsData },
      });
    }

    return { totalAmount, orderItemsData };
  }

  // ─── Staff order ───────────────────────────────────────────────────────────

  /** FIX H2: discount is capped so it can never exceed totalAmount. */
  async createAsStaff(userId: number, dto: CreateOrderDto) {
    await this.assertBranchOwner(userId, dto.branchId);

    const shiftId           = await this.shifts.findOpenShiftId(dto.branchId);
    const deliveryPlatformId = dto.orderType === 'DELIVERY' ? dto.deliveryPlatformId : undefined;
    const pricing            = await this.priceItems(dto.branchId, dto.items, deliveryPlatformId);

    // H2: cap the discount the client sends so it cannot exceed the real total
    const cappedDiscount = Math.min(dto.discountAmount ?? 0, pricing.totalAmount);

    return this.create(
      { ...dto, discountAmount: cappedDiscount, shiftId: shiftId ?? undefined },
      pricing,
    );
  }

  // ─── QR / customer order ───────────────────────────────────────────────────

  /**
   * FIX M1: QR-table orders are now linked to the branch's open shift so that
   * shift cash-summaries include revenue from self-ordering customers.
   */
  async createAtTable(dto: CreateOrderAtTableDto) {
    const { branchId, tableId } = await this.tableAccess.resolve(dto.qrCode);

    // M1: resolve shift before creating so the order carries shiftId
    const shiftId = await this.shifts.findOpenShiftId(branchId);

    let customerId: number | undefined;
    if (dto.customerPhone) {
      const customer = await this.prisma.customer.findUnique({
        where: { phone_branchId: { phone: dto.customerPhone, branchId } },
        select: { id: true },
      });
      customerId = customer?.id;
    }

    const pricing = await this.priceItems(branchId, dto.items);

    let discountAmount = 0;
    if (dto.promotionId) {
      const priced = await this.promotions.checkAndPrice(
        branchId, dto.promotionId, pricing.totalAmount, customerId,
      );
      discountAmount = priced.discountAmount;
    }

    return this.create(
      {
        branchId, tableId, source: 'QR', items: dto.items, notes: dto.notes,
        ...(customerId      ? { customerId }                                      : {}),
        ...(dto.promotionId ? { promotionId: dto.promotionId, discountAmount }    : {}),
        ...(shiftId         ? { shiftId }                                         : {}),  // M1
      },
      pricing,
    );
  }

  // ─── Core create ──────────────────────────────────────────────────────────

  /**
   * FIX C3: Retries up to 3 times on a P2002 Unique Constraint collision so
   * that two simultaneous orders for the same branch never crash each other.
   */
  async create(
    dto: CreateOrderDto & { shiftId?: string },
    pricing?: { totalAmount: number; orderItemsData: any[] },
  ) {
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year   = today.getFullYear();
    const month  = (today.getMonth() + 1).toString().padStart(2, '0');
    const day    = today.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const { totalAmount, orderItemsData } =
      pricing ?? await this.priceItems(dto.branchId, dto.items, dto.deliveryPlatformId);

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // Derive sequence inside the tx to minimise (not eliminate) races;
          // the retry loop eliminates the remainder.
          const lastOrder = await tx.order.findFirst({
            where: { orderNumber: { startsWith: `${dto.branchId}-${dateStr}-` } },
            orderBy: { orderNumber: 'desc' },
          });
          let txSequence = 1;
          if (lastOrder) {
            const lastSeq = parseInt(lastOrder.orderNumber.split('-')[2], 10);
            if (!isNaN(lastSeq)) txSequence = lastSeq + 1;
          }
          const txOrderNumber = `${dto.branchId}-${dateStr}-${txSequence.toString().padStart(3, '0')}`;

          const order = await tx.order.create({
            data: {
              orderNumber:     txOrderNumber,
              totalAmount,
              discountAmount:  dto.discountAmount ?? 0,
              status:          (dto.orderType === 'DELIVERY' || dto.isPrepaid) ? 'PAID' : 'PENDING',
              paymentType:     dto.orderType === 'DELIVERY'
                                 ? (dto.paymentType || 'TRANSFER')
                                 : dto.isPrepaid ? dto.paymentType : null,
              orderType:       dto.orderType || 'DINE_IN',
              deliveryPlatform: dto.deliveryPlatform ?? null,
              branchId:        dto.branchId,
              tableId:         dto.tableId === 0 ? null : dto.tableId,
              source:          dto.source || 'CUSTOMER',
              notes:           dto.notes || null,
              ...(dto.customerId  ? { customerId:  dto.customerId }  : {}),
              ...(dto.promotionId ? { promotionId: dto.promotionId } : {}),
              ...(dto.shiftId     ? { shiftId:     dto.shiftId }     : {}),
              items: { create: orderItemsData },
            },
            include: { items: { include: { options: true } } },
          });

          if (dto.tableId && dto.tableId !== 0 && !dto.isPrepaid && dto.orderType !== 'DELIVERY') {
            await tx.table.update({
              where: { id: dto.tableId },
              data:  { status: 'OCCUPIED' },
            });
          }

          // Points handling for prepaid / delivery orders
          if ((dto.isPrepaid || dto.orderType === 'DELIVERY') && dto.customerId) {
            const branchForRate = await tx.branch.findUnique({
              where:  { id: dto.branchId },
              select: { rewardPointRate: true },
            });
            const POINTS_RATE =
              branchForRate?.rewardPointRate && branchForRate.rewardPointRate > 0
                ? branchForRate.rewardPointRate
                : 100;

            const finalTotal = Math.max(0, totalAmount - (dto.discountAmount ?? 0));

            if (dto.promotionId && (dto.discountAmount ?? 0) > 0) {
              const promo = await tx.promotion.findUnique({ where: { id: dto.promotionId } });
              if (promo?.type === 'POINTS_REDEMPTION' && promo.pointsNeeded > 0) {
                // FIX M4: atomic deduction — eliminates TOCTOU race
                const { count } = await tx.customer.updateMany({
                  where: { id: dto.customerId, points: { gte: promo.pointsNeeded } },
                  data:  { points: { decrement: promo.pointsNeeded } },
                });
                if (count === 0) {
                  const cust = await tx.customer.findUnique({
                    where: { id: dto.customerId }, select: { points: true },
                  });
                  throw new Error(
                    `แต้มไม่พอ (มี ${cust?.points ?? 0} ต้องการ ${promo.pointsNeeded})`,
                  );
                }
                await tx.redemptionHistory.create({
                  data: {
                    customerId:     dto.customerId,
                    promotionId:    dto.promotionId,
                    pointsSpent:    promo.pointsNeeded,
                    discountAmount: dto.discountAmount ?? 0,
                    orderId:        order.id,
                  },
                });
              }
            }

            if (finalTotal > 0) {
              const pointsToAward = Math.floor(finalTotal / POINTS_RATE);
              if (pointsToAward > 0) {
                await tx.customer.update({
                  where: { id: dto.customerId },
                  data:  { points: { increment: pointsToAward } },
                });
              }
            }
          }

          return order;
        });
      } catch (e: any) {
        // C3: retry on duplicate order number collision
        if (e?.code === 'P2002' && attempt < MAX_RETRIES) {
          this.logger.warn(`Order number collision (attempt ${attempt}), retrying…`);
          continue;
        }
        throw e;
      }
    }
    throw new BadRequestException('ไม่สามารถสร้างออเดอร์ได้ กรุณาลองอีกครั้ง');
  }

  // ─── Query helpers ─────────────────────────────────────────────────────────

  /** FIX M7: Paginated — avoids loading thousands of records in one shot. */
  async findAllByBranch(branchId: number, page = 1, limit = 50) {
    const safePage  = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip      = (safePage - 1) * safeLimit;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where: { branchId } }),
      this.prisma.order.findMany({
        where:   { branchId },
        include: { items: { include: { options: true } }, table: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    safeLimit,
      }),
    ]);

    return { total, page: safePage, limit: safeLimit, orders };
  }

  /**
   * FIX C2: Verifies the kitchen belongs to a branch the caller owns before
   * returning order items — prevents cross-tenant data leakage.
   */
  async findByKitchen(userId: number, kitchenId: number) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where:  { id: kitchenId },
      select: { branch: { select: { id: true, brand: { select: { userId: true } } } } },
    });
    if (!kitchen || kitchen.branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงครัวนี้');
    }
    try {
      return await this.prisma.orderItem.findMany({
        where: {
          kitchenId,
          status: { in: ['PENDING', 'COOKING', 'READY'] },
        },
        include: { order: { include: { table: true } }, options: true },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching items for kitchen ${kitchenId}:`, error);
      throw error;
    }
  }

  async findByBranchKitchenItems(branchId: number) {
    try {
      return await this.prisma.orderItem.findMany({
        where: {
          order:  { branchId },
          status: { in: ['PENDING', 'COOKING', 'READY'] },
        },
        include: { order: { include: { table: true } }, options: true },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching kitchen items for branch ${branchId}:`, error);
      throw error;
    }
  }

  /**
   * FIX C2: Verifies the order item belongs to a branch the caller owns before
   * allowing a status change — prevents cross-tenant order manipulation.
   */
  async updateItemStatus(userId: number, itemId: number, status: any) {
    const item = await this.prisma.orderItem.findUnique({
      where:   { id: itemId },
      include: { order: { select: { branchId: true, branch: { select: { brand: { select: { userId: true } } } } } } },
    });
    if (!item) throw new NotFoundException('ไม่พบรายการนี้');
    if (item.order.branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขรายการนี้');
    }

    const updatedItem = await this.prisma.orderItem.update({
      where:   { id: itemId },
      data:    { status },
      include: { order: { include: { items: true } } },
    });

    const allServed = updatedItem.order.items.every(i => i.status === 'SERVED');
    if (allServed && updatedItem.order.status !== 'SERVED') {
      await this.prisma.order.update({
        where: { id: updatedItem.orderId },
        data:  { status: 'SERVED' },
      });
    }
    return updatedItem;
  }

  /** FIX M3: Cancels an order and resets the table to AVAILABLE when no other
   *  active orders remain — previously the table stayed OCCUPIED forever. */
  async cancelOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where:   { id: orderId },
      include: { branch: { select: { brand: { select: { userId: true } } } } },
    });
    if (!order) throw new NotFoundException('ไม่พบออเดอร์');
    if (order.branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์ยกเลิกออเดอร์นี้');
    }
    if (['PAID', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('ไม่สามารถยกเลิกออเดอร์ที่ชำระแล้วหรือยกเลิกแล้ว');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });

      if (order.tableId) {
        const remaining = await tx.order.count({
          where: {
            tableId: order.tableId,
            id:      { not: orderId },
            status:  { notIn: ['PAID', 'CANCELLED'] },
          },
        });
        if (remaining === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data:  { status: 'AVAILABLE' },
          });
        }
      }
    });

    return { success: true };
  }

  async findUnpaidByTable(tableId: number) {
    return this.prisma.order.findMany({
      where: {
        tableId,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      include: { items: { include: { options: true } }, table: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findUnpaidByBranch(branchId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      include: { table: true, items: { include: { options: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = orders.reduce((acc, order) => {
      const tableId = order.tableId || 0;
      if (!acc[tableId]) {
        acc[tableId] = { tableId, table: order.table, orders: [], totalAmount: 0 };
      }
      acc[tableId].orders.push(order);
      acc[tableId].totalAmount += order.totalAmount;
      return acc;
    }, {} as Record<number, any>);

    return Object.values(grouped);
  }

  /**
   * FIX C1: Verifies the caller owns the branch that the table belongs to
   *         before touching any payment data — prevents cross-tenant IDOR.
   * FIX M4: Points deduction uses an atomic updateMany so two simultaneous
   *         redemptions cannot both pass the balance check and over-deduct.
   */
  async completePayment(
    userId: number,
    tableId: number,
    paymentType: 'CASH' | 'TRANSFER',
    opts?: {
      customerId?:     number;
      promotionId?:    number;
      discountAmount?: number;
    },
  ) {
    // C1: Establish and verify branch ownership BEFORE any mutation
    let branchId: number;
    if (tableId && tableId !== 0) {
      const table = await this.prisma.table.findUnique({
        where:  { id: tableId },
        select: { zone: { select: { branchId: true } } },
      });
      if (!table) throw new NotFoundException('ไม่พบโต๊ะ');
      branchId = table.zone.branchId;
    } else {
      // Walk-in (tableId = 0): derive branchId from the most recent unpaid walk-in
      const sample = await this.prisma.order.findFirst({
        where:   { tableId: null, status: { notIn: ['PAID', 'CANCELLED'] } },
        select:  { branchId: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!sample) return { success: true };
      branchId = sample.branchId;
    }
    await this.assertBranchOwner(userId, branchId);

    await this.prisma.$transaction(async (tx) => {
      const unpaid = await tx.order.findMany({
        where: {
          branchId,                                          // C1: always scoped
          tableId: tableId === 0 ? null : tableId,
          status:  { notIn: ['PAID', 'CANCELLED'] },
        },
        select: { id: true, totalAmount: true, branchId: true, customerId: true },
      });
      if (!unpaid.length) return;

      const customerId = opts?.customerId
        ?? unpaid.find(o => o.customerId)?.customerId
        ?? undefined;

      const branchRow = await tx.branch.findUnique({
        where:  { id: branchId },
        select: { rewardPointRate: true },
      });
      const POINTS_RATE =
        branchRow?.rewardPointRate && branchRow.rewardPointRate > 0
          ? branchRow.rewardPointRate
          : 100;

      const grossTotal   = unpaid.reduce((s, o) => s + o.totalAmount, 0);
      const discount     = opts?.discountAmount ?? 0;
      const finalTotal   = Math.max(0, grossTotal - discount);
      const orderIds     = unpaid.map(o => o.id);
      const firstOrderId = unpaid[0].id;

      const { count: paidCount } = await tx.order.updateMany({
        where: { id: { in: orderIds }, status: { notIn: ['PAID', 'CANCELLED'] } },
        data: {
          status:      'PAID',
          paymentType,
          ...(customerId        ? { customerId }                       : {}),
          ...(opts?.promotionId ? { promotionId: opts.promotionId }    : {}),
          ...(discount > 0      ? { discountAmount: discount }         : {}),
        },
      });
      if (paidCount === 0) return;

      if (opts?.promotionId && customerId && discount > 0) {
        const promotion = await tx.promotion.findUnique({ where: { id: opts.promotionId } });
        if (promotion?.type === 'POINTS_REDEMPTION' && promotion.pointsNeeded > 0) {
          // M4: atomic — prevents double-redemption under concurrent requests
          const { count } = await tx.customer.updateMany({
            where: { id: customerId, points: { gte: promotion.pointsNeeded } },
            data:  { points: { decrement: promotion.pointsNeeded } },
          });
          if (count === 0) {
            const cust = await tx.customer.findUnique({
              where: { id: customerId }, select: { points: true },
            });
            throw new Error(
              `แต้มไม่พอ (มี ${cust?.points ?? 0} แต้ม ต้องการ ${promotion.pointsNeeded} แต้ม)`,
            );
          }
          await tx.redemptionHistory.create({
            data: {
              customerId,
              promotionId:    opts.promotionId,
              pointsSpent:    promotion.pointsNeeded,
              discountAmount: discount,
              orderId:        firstOrderId,
            },
          });
        }
      }

      if (customerId && finalTotal > 0) {
        const pointsToAward = Math.floor(finalTotal / POINTS_RATE);
        if (pointsToAward > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data:  { points: { increment: pointsToAward } },
          });
        }
      }

      if (tableId && tableId !== 0) {
        await tx.table.update({
          where: { id: tableId },
          data:  { status: 'AVAILABLE' },
        });
      }
    });

    return { success: true };
  }

  /** ใช้ภายในเมื่อสร้าง Order ใหม่เพื่อผูกกะอัตโนมัติ */
  async findOpenShiftId(branchId: number): Promise<string | null> {
    return this.shifts.findOpenShiftId(branchId);
  }
}
