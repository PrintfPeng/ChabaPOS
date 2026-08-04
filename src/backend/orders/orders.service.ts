import {
  Injectable, Inject, NotFoundException, ForbiddenException, Logger,
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
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TableAccessService) private readonly tableAccess: TableAccessService,
    @Inject(PromotionsService) private readonly promotions: PromotionsService,
    @Inject(ShiftsService) private readonly shifts: ShiftsService,
  ) {
    this.logger.log('OrdersService initialized');
  }

  /**
   * Prices the requested items from the menu — never from anything the client
   * sends, and only from menus and options that belong to this branch. Without
   * the branch filter an order could be built from another shop's menu and its
   * prices, then booked against this one.
   */
  private async priceItems(branchId: number, items: CreateOrderDto['items']) {
    const menuItemIds = items.map(i => i.menuItemId);
    const allOptionIds = items.flatMap(i => i.options?.map(o => o.optionId) ?? []);

    // Batch-fetch all needed rows in 2 parallel queries — eliminates N+1
    const [menuItems, options] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, branchId },
        include: { kitchen: true },
      }),
      allOptionIds.length > 0
        ? this.prisma.option.findMany({
            where: { id: { in: allOptionIds }, optionGroup: { branchId } },
          })
        : Promise.resolve([]),
    ]);

    const menuMap   = new Map(menuItems.map(m => [m.id, m]));
    const optionMap = new Map(options.map(o => [o.id, o]));

    let totalAmount = 0;
    const orderItemsData: any[] = [];

    for (const itemDto of items) {
      const menuItem = menuMap.get(itemDto.menuItemId);
      if (!menuItem) {
        throw new NotFoundException(`Menu item ${itemDto.menuItemId} not found in this branch`);
      }

      let itemPrice = menuItem.price;
      const optionsData = [];

      if (itemDto.options) {
        for (const optDto of itemDto.options) {
          const option = optionMap.get(optDto.optionId);
          if (!option) {
            throw new NotFoundException(`Option ${optDto.optionId} not found in this branch`);
          }
          itemPrice += option.price;
          optionsData.push({ optionId: option.id, name: option.name, price: option.price });
        }
      }

      totalAmount += itemPrice * itemDto.quantity;
      orderItemsData.push({
        menuItemId: menuItem.id,
        name:       menuItem.name,
        price:      menuItem.price,
        quantity:   itemDto.quantity,
        notes:      itemDto.notes || null,
        kitchenId:  menuItem.kitchenId,
        options:    { create: optionsData },
      });
    }

    return { totalAmount, orderItemsData };
  }

  private async assertBranchOwner(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { brand: { select: { userId: true } } },
    });
    if (!branch || branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
    }
  }

  /** Staff-created order (counter, delivery, in-house ordering). */
  async createAsStaff(userId: number, dto: CreateOrderDto) {
    await this.assertBranchOwner(userId, dto.branchId);
    // ผูก shiftId อัตโนมัติจากกะที่เปิดอยู่ของสาขา
    const shiftId = await this.shifts.findOpenShiftId(dto.branchId);
    return this.create({ ...dto, shiftId: shiftId ?? undefined });
  }

  /**
   * Order placed by a customer from the QR page.
   *
   * Everything that decides money or ownership is derived on the server:
   * branch and table come from the scanned QR code, the member is resolved from
   * a phone number within that branch, and the discount is recalculated from the
   * promotion rules. The browser cannot name a customer id, a branch, or a
   * discount of its own choosing.
   */
  async createAtTable(dto: CreateOrderAtTableDto) {
    const { branchId, tableId } = await this.tableAccess.resolve(dto.qrCode);

    let customerId: number | undefined;
    if (dto.customerPhone) {
      const customer = await this.prisma.customer.findUnique({
        where: { phone_branchId: { phone: dto.customerPhone, branchId } },
        select: { id: true },
      });
      // An unknown phone simply earns nothing — sign-up happens at the counter.
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
        branchId,
        tableId,
        source: 'QR',
        items: dto.items,
        notes: dto.notes,
        ...(customerId ? { customerId } : {}),
        ...(dto.promotionId ? { promotionId: dto.promotionId, discountAmount } : {}),
      },
      pricing,
    );
  }

  async create(
    dto: CreateOrderDto & { shiftId?: string },
    pricing?: { totalAmount: number; orderItemsData: any[] },
  ) {
    // 1. Validate Branch
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    // 2. Date string for order number prefix (computed outside tx — pure JS, no DB access)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year  = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day   = today.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // 3. Process Items and Calculate Total (reused when the caller already priced them)
    const { totalAmount, orderItemsData } = pricing ?? await this.priceItems(dto.branchId, dto.items);

    // 4–6. Order creation, table update, and points handling are a single atomic transaction.
    // A failure in any step rolls back everything — no orphan PAID orders.
    return this.prisma.$transaction(async (tx) => {
      // Re-derive order number inside the transaction to reduce (but not eliminate) the
      // duplicate-sequence risk under concurrent requests.
      const lastOrderInTx = await tx.order.findFirst({
        where: { orderNumber: { startsWith: `${dto.branchId}-${dateStr}-` } },
        orderBy: { orderNumber: 'desc' },
      });
      let txSequence = 1;
      if (lastOrderInTx) {
        const parts = lastOrderInTx.orderNumber.split('-');
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) txSequence = lastSeq + 1;
      }
      const txOrderNumber = `${dto.branchId}-${dateStr}-${txSequence.toString().padStart(3, '0')}`;

      // 4. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber: txOrderNumber,
          totalAmount,
          discountAmount: dto.discountAmount ?? 0,
          status: (dto.orderType === 'DELIVERY' || dto.isPrepaid) ? 'PAID' : 'PENDING',
          paymentType: dto.orderType === 'DELIVERY' ? (dto.paymentType || 'TRANSFER') : (dto.isPrepaid ? dto.paymentType : null),
          orderType: dto.orderType || 'DINE_IN',
          deliveryPlatform: dto.deliveryPlatform ?? null,
          branchId: dto.branchId,
          tableId: dto.tableId === 0 ? null : dto.tableId,
          source: dto.source || 'CUSTOMER',
          notes: dto.notes || null,
          ...(dto.customerId  ? { customerId:  dto.customerId }  : {}),
          ...(dto.promotionId ? { promotionId: dto.promotionId } : {}),
          ...(dto.shiftId     ? { shiftId:     dto.shiftId }     : {}),
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { options: true } },
        },
      });

      // 5. Update Table Status
      if (dto.tableId && dto.tableId !== 0 && !dto.isPrepaid && dto.orderType !== 'DELIVERY') {
        await tx.table.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      // 6. Award/deduct points for prepaid orders with a member (STAFF/counter-service flow).
      // Runs in the same transaction — a points failure rolls back the order too.
      if ((dto.isPrepaid || dto.orderType === 'DELIVERY') && dto.customerId) {
        const branchForRate = await tx.branch.findUnique({
          where: { id: dto.branchId },
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
            const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
            if (!customer || customer.points < promo.pointsNeeded) {
              throw new Error(
                `แต้มไม่พอ (มี ${customer?.points ?? 0} ต้องการ ${promo.pointsNeeded})`,
              );
            }
            await tx.customer.update({
              where: { id: dto.customerId },
              data: { points: { decrement: promo.pointsNeeded } },
            });
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
              data: { points: { increment: pointsToAward } },
            });
          }
        }
      }

      return order;
    });
  }

  async findAllByBranch(branchId: number) {
    return this.prisma.order.findMany({
      where: { branchId },
      include: {
        items: {
          include: {
            options: true,
          },
        },
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByKitchen(kitchenId: number) {
    try {
      return await this.prisma.orderItem.findMany({
        where: { 
          kitchenId, 
          status: { 
            in: ['PENDING', 'COOKING', 'READY'] 
          } 
        },
        include: {
          order: {
            include: { table: true },
          },
          options: true,
        },
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
          order: { branchId },
          status: { 
            in: ['PENDING', 'COOKING', 'READY'] 
          } 
        },
        include: {
          order: {
            include: { table: true },
          },
          options: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching kitchen items for branch ${branchId}:`, error);
      throw error;
    }
  }

  async updateItemStatus(itemId: number, status: any) {
    const updatedItem = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { order: { include: { items: true } } },
    });

    // Check if ALL items in the order are now SERVED
    const allServed = updatedItem.order.items.every(item => item.status === 'SERVED');
    if (allServed && updatedItem.order.status !== 'SERVED') {
      await this.prisma.order.update({
        where: { id: updatedItem.orderId },
        data: { status: 'SERVED' },
      });
    }

    return updatedItem;
  }

  async findUnpaidByTable(tableId: number) {
    return this.prisma.order.findMany({
      where: {
        tableId,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      include: {
        items: {
          include: {
            options: true,
          },
        },
        table: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findUnpaidByBranch(branchId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      include: {
        table: true,
        items: {
          include: {
            options: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by table for the UI
    const grouped = orders.reduce((acc, order) => {
      const tableId = order.tableId || 0;
      if (!acc[tableId]) {
        acc[tableId] = {
          tableId: tableId,
          table: order.table,
          orders: [],
          totalAmount: 0,
        };
      }
      acc[tableId].orders.push(order);
      acc[tableId].totalAmount += order.totalAmount;
      return acc;
    }, {} as Record<number, any>);

    return Object.values(grouped);
  }

  /**
   * ปิดบิลและชำระเงิน — รองรับสมาชิก, โปรโมชั่น, การหักแต้มและสะสมแต้ม
   * ทุกอย่างอยู่ใน $transaction เดียวเพื่อความสม่ำเสมอของข้อมูล
   */
  async completePayment(
    tableId: number,
    paymentType: 'CASH' | 'TRANSFER',
    opts?: {
      customerId?:     number;
      promotionId?:    number;
      discountAmount?: number;
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      // 1. ดึง order ที่ยังไม่ได้ชำระทั้งหมด
      const unpaid = await tx.order.findMany({
        where: {
          tableId: tableId === 0 ? null : tableId,
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
        select: { id: true, totalAmount: true, branchId: true, customerId: true },
      });
      if (!unpaid.length) return;

      // The cashier's lookup wins, but fall back to the member the customer
      // already identified themselves as when ordering from the QR page —
      // otherwise those points would silently never be awarded.
      const customerId = opts?.customerId ?? unpaid.find(o => o.customerId)?.customerId ?? undefined;

      // ดึง rewardPointRate ของสาขา (fallback 100)
      const branchId = unpaid[0].branchId;
      const branch = await tx.branch.findUnique({
        where: { id: branchId },
        select: { rewardPointRate: true },
      });
      const POINTS_RATE = branch?.rewardPointRate && branch.rewardPointRate > 0
        ? branch.rewardPointRate
        : 100;

      const grossTotal   = unpaid.reduce((s, o) => s + o.totalAmount, 0);
      const discount     = opts?.discountAmount ?? 0;
      const finalTotal   = Math.max(0, grossTotal - discount);
      const orderIds     = unpaid.map((o) => o.id);
      const firstOrderId = unpaid[0].id;

      // 2. Mark all orders PAID — status predicate ensures idempotency on concurrent calls
      const { count: paidCount } = await tx.order.updateMany({
        where: { id: { in: orderIds }, status: { notIn: ['PAID', 'CANCELLED'] } },
        data: {
          status:      'PAID',
          paymentType,
          ...(customerId        ? { customerId }                       : {}),
          ...(opts?.promotionId ? { promotionId:    opts.promotionId } : {}),
          ...(discount > 0      ? { discountAmount: discount         } : {}),
        },
      });
      // A concurrent request already processed this payment — nothing left to do
      if (paidCount === 0) return;

      // 3. ถ้าเป็น POINTS_REDEMPTION → ตรวจแต้ม → หักแต้ม → บันทึกประวัติ
      if (opts?.promotionId && customerId && discount > 0) {
        const promotion = await tx.promotion.findUnique({
          where: { id: opts.promotionId },
        });

        if (promotion?.type === 'POINTS_REDEMPTION' && promotion.pointsNeeded > 0) {
          const customer = await tx.customer.findUnique({
            where: { id: customerId },
          });

          // Guard: ป้องกันแต้มติดลบ
          if (!customer || customer.points < promotion.pointsNeeded) {
            throw new Error(
              `แต้มไม่พอ (มี ${customer?.points ?? 0} แต้ม ต้องการ ${promotion.pointsNeeded} แต้ม)`,
            );
          }

          // หักแต้ม
          await tx.customer.update({
            where: { id: customerId },
            data: { points: { decrement: promotion.pointsNeeded } },
          });

          // บันทึก RedemptionHistory
          await tx.redemptionHistory.create({
            data: {
              customerId,
              promotionId:   opts.promotionId,
              pointsSpent:   promotion.pointsNeeded,
              discountAmount: discount,
              orderId:        firstOrderId,
            },
          });
        }
      }

      // 4. สะสมแต้มจากยอดชำระจริง (หลังหักส่วนลดแล้ว)
      if (customerId && finalTotal > 0) {
        const pointsToAward = Math.floor(finalTotal / POINTS_RATE);
        if (pointsToAward > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { points: { increment: pointsToAward } },
          });
        }
      }

      // 5. คืนสถานะโต๊ะ
      if (tableId && tableId !== 0) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    });

    return { success: true };
  }
}
