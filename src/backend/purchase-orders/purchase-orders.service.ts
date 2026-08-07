import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderStatusDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';
import { assertBranchAccess } from '../common/branch-access.helper';

// A1-11: valid state-machine transitions for purchase orders
const PO_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class PurchaseOrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreatePurchaseOrderDto) {
    // A2-2: assertBranchAccess allows owner AND assigned staff
    await assertBranchAccess(this.prisma, userId, dto.branchId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('กรุณาระบุวัตถุดิบที่ต้องการสั่งซื้อ');
    }

    // A1-10: verify the supplier belongs to this branch
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, branchId: dto.branchId },
        select: { id: true },
      });
      if (!supplier) throw new BadRequestException('ซัพพลายเออร์ไม่ได้อยู่ในสาขานี้');
    }

    // A1-1: verify every rawMaterialId belongs to this branch
    const rawMaterialIds = dto.items.map(i => i.rawMaterialId);
    const validRawMaterials = await this.prisma.rawMaterial.findMany({
      where:  { id: { in: rawMaterialIds }, branchId: dto.branchId },
      select: { id: true },
    });
    if (validRawMaterials.length !== rawMaterialIds.length) {
      throw new BadRequestException('วัตถุดิบบางรายการไม่ได้อยู่ในสาขานี้');
    }

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + (item.quantity * (item.price ?? 0)),
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          supplierId:  dto.supplierId,
          branchId:    dto.branchId,
          totalAmount,
          items: {
            create: dto.items.map(item => ({
              rawMaterialId: item.rawMaterialId,
              quantity:      item.quantity,
              price:         item.price ?? 0,
            })),
          },
        },
        include: {
          items:    { include: { rawMaterial: true } },
          supplier: true,
        },
      });
      return order;
    });
  }

  async findAll(userId: number, branchId: number) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, branchId);

    return this.prisma.purchaseOrder.findMany({
      where:   { branchId },
      include: {
        supplier: true,
        items:    { include: { rawMaterial: { include: { category: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTodayOrders(userId: number, branchId: number) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, branchId);

    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.purchaseOrder.findMany({
      where: {
        branchId,
        createdAt: { gte: today, lt: tomorrow },
      },
      include: {
        supplier: true,
        items:    { include: { rawMaterial: { include: { category: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(userId: number, id: number, dto: UpdatePurchaseOrderStatusDto) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where:  { id },
      select: { id: true, branchId: true, status: true },
    });
    if (!order) throw new NotFoundException('ไม่พบใบสั่งซื้อวัตถุดิบนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, order.branchId);

    // A1-11: enforce state-machine transitions — prevent COMPLETED → PENDING etc.
    const allowed = PO_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `ไม่สามารถเปลี่ยนสถานะจาก ${order.status} เป็น ${dto.status} ได้`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data:  { status: dto.status },
    });
  }

  async receive(userId: number, id: number, dto: ReceivePurchaseOrderDto) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where:   { id },
      include: { supplier: true },
    });

    if (!order) throw new NotFoundException('ไม่พบใบสั่งซื้อวัตถุดิบนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, order.branchId);

    return this.prisma.$transaction(async (tx) => {
      // Atomic status guard — update ONLY if still PENDING to prevent double-processing
      const { count } = await tx.purchaseOrder.updateMany({
        where: { id, status: 'PENDING' },
        data:  { status: 'COMPLETED', totalAmount: dto.totalAmount },
      });
      if (count === 0) throw new BadRequestException('ใบสั่งซื้อนี้ได้รับการดำเนินการแล้ว หรือถูกยกเลิกแล้ว');

      // FIX E5: fetch all valid rawMaterialIds from the original PO before touching stock
      const poItems = await tx.purchaseOrderItem.findMany({
        where:  { purchaseOrderId: id },
        select: { id: true, rawMaterialId: true },
      });
      const validIds = new Set(poItems.map(p => p.rawMaterialId));

      for (const item of dto.items) {
        // E5: reject any rawMaterialId that was not part of this PO
        if (!validIds.has(item.rawMaterialId)) {
          throw new BadRequestException(
            `วัตถุดิบ ID ${item.rawMaterialId} ไม่ได้อยู่ในใบสั่งซื้อนี้`,
          );
        }

        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data:  { stock: { increment: item.actualQuantity } },
        });

        const poItem = poItems.find(p => p.rawMaterialId === item.rawMaterialId);
        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data:  { quantity: item.actualQuantity, price: item.pricePerUnit },
          });
        }
      }

      await tx.expense.create({
        data: {
          amount:          dto.totalAmount,
          description:     `รับเข้าวัตถุดิบจากใบสั่งซื้อ PO-${String(order.id).padStart(5, '0')} (${order.supplier.name})`,
          branchId:        order.branchId,
          purchaseOrderId: order.id,
        },
      });

      return { success: true };
    });
  }

  async remove(userId: number, id: number) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where:  { id },
      select: { id: true, branchId: true, status: true },
    });
    if (!order) throw new NotFoundException('ไม่พบใบสั่งซื้อวัตถุดิบนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, order.branchId);

    // A1-11: only PENDING or CANCELLED orders can be deleted
    if (order.status === 'COMPLETED') {
      throw new BadRequestException('ไม่สามารถลบใบสั่งซื้อที่รับสินค้าแล้ว');
    }

    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
