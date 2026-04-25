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
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    today.setHours(0, 0, 0, 0);
    
    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: today,
        },
        branchId: dto.branchId,
      },
    });
    
    const orderNumber = `${dto.branchId}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

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
        branchId: dto.branchId,
        tableId: dto.tableId === 0 ? null : dto.tableId,
        source: dto.source || 'CUSTOMER',
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
    if (dto.tableId && dto.tableId !== 0) {
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

  async completePayment(tableId: number, paymentType: 'CASH' | 'TRANSFER') {
    // 1. Update all unpaid orders to PAID
    // If tableId is 0, we update orders where tableId is null
    await this.prisma.order.updateMany({
      where: {
        tableId: tableId === 0 ? null : tableId,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      data: {
        status: 'PAID',
        paymentType,
      },
    });

    // 2. Clear table status to AVAILABLE only if it's a real table
    if (tableId && tableId !== 0) {
      return this.prisma.table.update({
        where: { id: tableId },
        data: { status: 'AVAILABLE' },
      });
    }
    
    return { success: true };
  }
}
