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

    // 2. Generate Order Number (e.g., A001)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: today,
        },
        branchId: dto.branchId,
      },
    });
    
    const orderNumber = `A${(count + 1).toString().padStart(3, '0')}`;

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
    return this.prisma.order.create({
      data: {
        orderNumber,
        totalAmount,
        branchId: dto.branchId,
        tableId: dto.tableId,
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
    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
    });
  }
}
