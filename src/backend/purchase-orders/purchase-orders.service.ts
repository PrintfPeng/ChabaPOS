import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderStatusDto } from './dto/purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreatePurchaseOrderDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('กรุณาระบุวัตถุดิบที่ต้องการสั่งซื้อ');
    }

    const totalAmount = dto.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    return this.prisma.$transaction(async (prisma) => {
      const order = await prisma.purchaseOrder.create({
        data: {
          supplierId: dto.supplierId,
          branchId: dto.branchId,
          totalAmount: totalAmount,
          items: {
            create: dto.items.map(item => ({
              rawMaterialId: item.rawMaterialId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: {
          items: {
            include: {
              rawMaterial: true
            }
          },
          supplier: true
        }
      });
      return order;
    });
  }

  async findAll(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.purchaseOrder.findMany({
      where: { branchId },
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTodayOrders(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.purchaseOrder.findMany({
      where: {
        branchId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        }
      },
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(userId: number, id: number, dto: UpdatePurchaseOrderStatusDto) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!order || order.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(userId: number, id: number) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!order || order.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
