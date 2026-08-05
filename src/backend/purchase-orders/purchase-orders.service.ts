import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderStatusDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';

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

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + (item.quantity * (item.price ?? 0)),
      0,
    );

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
              price: item.price ?? 0,
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

  async receive(userId: number, id: number, dto: ReceivePurchaseOrderDto) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        branch: { include: { brand: true } },
        supplier: true
      },
    });

    if (!order) {
      throw new BadRequestException('ไม่พบใบสั่งซื้อวัตถุดิบนี้');
    }

    if (order.branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Atomic status guard — update ONLY if still PENDING to prevent double-processing
      const { count } = await tx.purchaseOrder.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'COMPLETED', totalAmount: dto.totalAmount },
      });
      if (count === 0) throw new BadRequestException('ใบสั่งซื้อนี้ได้รับการดำเนินการแล้ว หรือถูกยกเลิกแล้ว');

      // FIX E5: fetch all valid rawMaterialIds from the original PO before touching stock
      const poItems = await tx.purchaseOrderItem.findMany({
        where:  { purchaseOrderId: id },
        select: { id: true, rawMaterialId: true },
      });
      const validIds = new Set(poItems.map(p => p.rawMaterialId));

      // 2. Loop through each received item
      for (const item of dto.items) {
        // E5: reject any rawMaterialId that was not part of this PO
        if (!validIds.has(item.rawMaterialId)) {
          throw new BadRequestException(
            `วัตถุดิบ ID ${item.rawMaterialId} ไม่ได้อยู่ในใบสั่งซื้อนี้`,
          );
        }

        // Increment stock only for validated materials
        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data:  { stock: { increment: item.actualQuantity } },
        });

        // Update item quantity and price
        const poItem = poItems.find(p => p.rawMaterialId === item.rawMaterialId);
        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data:  { quantity: item.actualQuantity, price: item.pricePerUnit },
          });
        }
      }

      // 3. Create expense record
      await tx.expense.create({
        data: {
          amount: dto.totalAmount,
          description: `รับเข้าวัตถุดิบจากใบสั่งซื้อ PO-${String(order.id).padStart(5, '0')} (${order.supplier.name})`,
          branchId: order.branchId,
          purchaseOrderId: order.id,
        },
      });

      return { success: true };
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
