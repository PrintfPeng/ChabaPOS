import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.logger.log('OrdersService initialized');
  }

  async create(dto: CreateOrderDto) {
    // 1. Validate Branch
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    // 2. Generate Order Number (e.g., 1-20240418-001)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `${dto.branchId}-${dateStr}-`,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
    
    const orderNumber = `${dto.branchId}-${dateStr}-${sequence.toString().padStart(3, '0')}`;

    // 3. Process Items and Calculate Total
    let totalAmount = 0;
    const orderItemsData = [];

    for (const itemDto of dto.items) {
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: itemDto.menuItemId },
        include: { kitchen: true },
      });

      if (!menuItem) throw new NotFoundException(`Menu item ${itemDto.menuItemId} not found`);

      let itemPrice = menuItem.price;
      const optionsData = [];

      if (itemDto.options) {
        for (const optDto of itemDto.options) {
          const option = await this.prisma.option.findUnique({
            where: { id: optDto.optionId },
          });
          if (option) {
            itemPrice += option.price;
            optionsData.push({
              optionId: option.id,
              name: option.name,
              price: option.price,
            });
          }
        }
      }

      totalAmount += itemPrice * itemDto.quantity;

      orderItemsData.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: itemDto.quantity,
        notes: itemDto.notes || null,
        kitchenId: menuItem.kitchenId,
        options: {
          create: optionsData,
        },
      });
    }

    // 4. Create Order in Transaction
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        totalAmount,
        status: dto.isPrepaid ? 'PAID' : 'PENDING',
        paymentType: dto.isPrepaid ? dto.paymentType : null,
        branchId: dto.branchId,
        tableId: dto.tableId === 0 ? null : dto.tableId,
        source: dto.source || 'CUSTOMER',
        notes: dto.notes || null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            options: true,
          },
        },
      },
    });

    // 5. Update Table Status if tableId is present and not 0
    // If it's prepaid, we don't necessarily want to mark the table as OCCUPIED because the transaction is already closed.
    // However, if they selected a table, someone is sitting there. 
    // But standard "PAID" logic in this app clears the table status.
    // Let's stick to the user request: "ชำระเงินสำเร็จ -> ส่งออเดอร์เข้าครัว และ บันทึกสถานะบิลเป็น ชำระเงินแล้ว (Paid) ทันที"
    // In completePayment, table is set back to AVAILABLE.
    // So for prepaid, we probably shouldn't even set it to OCCUPIED if it's a one-off transaction,
    // OR we set it to OCCUPIED if they are staying. 
    // But if we want it to be "Paid", usually it means the table is free to be cleared or was never really "occupied" in the sense of an open bill.
    if (dto.tableId && dto.tableId !== 0 && !dto.isPrepaid) {
      await this.prisma.table.update({
        where: { id: dto.tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    return order;
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
    const POINTS_RATE = 100; // 1 แต้ม ต่อ 100 บาท

    await this.prisma.$transaction(async (tx) => {
      // 1. ดึง order ที่ยังไม่ได้ชำระทั้งหมด
      const unpaid = await tx.order.findMany({
        where: {
          tableId: tableId === 0 ? null : tableId,
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
        select: { id: true, totalAmount: true },
      });
      if (!unpaid.length) return;

      const grossTotal   = unpaid.reduce((s, o) => s + o.totalAmount, 0);
      const discount     = opts?.discountAmount ?? 0;
      const finalTotal   = Math.max(0, grossTotal - discount);
      const orderIds     = unpaid.map((o) => o.id);
      const firstOrderId = unpaid[0].id;

      // 2. Mark all orders PAID
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: {
          status:      'PAID',
          paymentType,
          ...(opts?.customerId  ? { customerId:     opts.customerId  } : {}),
          ...(opts?.promotionId ? { promotionId:    opts.promotionId } : {}),
          ...(discount > 0      ? { discountAmount: discount         } : {}),
        },
      });

      // 3. ถ้าเป็น POINTS_REDEMPTION → ตรวจแต้ม → หักแต้ม → บันทึกประวัติ
      if (opts?.promotionId && opts?.customerId && discount > 0) {
        const promotion = await tx.promotion.findUnique({
          where: { id: opts.promotionId },
        });

        if (promotion?.type === 'POINTS_REDEMPTION' && promotion.pointsNeeded > 0) {
          const customer = await tx.customer.findUnique({
            where: { id: opts.customerId },
          });

          // Guard: ป้องกันแต้มติดลบ
          if (!customer || customer.points < promotion.pointsNeeded) {
            throw new Error(
              `แต้มไม่พอ (มี ${customer?.points ?? 0} แต้ม ต้องการ ${promotion.pointsNeeded} แต้ม)`,
            );
          }

          // หักแต้ม
          await tx.customer.update({
            where: { id: opts.customerId },
            data: { points: { decrement: promotion.pointsNeeded } },
          });

          // บันทึก RedemptionHistory
          await tx.redemptionHistory.create({
            data: {
              customerId:    opts.customerId,
              promotionId:   opts.promotionId,
              pointsSpent:   promotion.pointsNeeded,
              discountAmount: discount,
              orderId:        firstOrderId,
            },
          });
        }
      }

      // 4. สะสมแต้มจากยอดชำระจริง (หลังหักส่วนลดแล้ว)
      if (opts?.customerId && finalTotal > 0) {
        const pointsToAward = Math.floor(finalTotal / POINTS_RATE);
        if (pointsToAward > 0) {
          await tx.customer.update({
            where: { id: opts.customerId },
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
