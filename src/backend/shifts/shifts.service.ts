import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async assertBranchOwner(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { brand: { select: { userId: true } } },
    });
    if (!branch || branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
    }
  }

  async getCurrentShift(branchId: number) {
    return this.prisma.shift.findFirst({
      where: { branchId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
  }

  async openShift(branchId: number, userId: number, dto: OpenShiftDto) {
    await this.assertBranchOwner(userId, branchId);

    const existing = await this.getCurrentShift(branchId);
    if (existing) {
      throw new BadRequestException('มีกะที่เปิดอยู่แล้ว กรุณาปิดกะเดิมก่อน');
    }

    await this.prisma.branch.findUniqueOrThrow({ where: { id: branchId } });

    // FIX E1: catch P2002 from a unique-constraint race (two staff opening
    // simultaneously both pass the check above, but only one can commit).
    try {
      return await this.prisma.shift.create({
        data: {
          branchId,
          openedById:   userId,
          startingCash: dto.startingCash,
          status:       'OPEN',
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('มีกะที่เปิดอยู่แล้ว กรุณาปิดกะเดิมก่อน');
      }
      throw e;
    }
  }

  async closeShift(branchId: number, userId: number, dto: CloseShiftDto) {
    await this.assertBranchOwner(userId, branchId);

    const shift = await this.getCurrentShift(branchId);
    if (!shift) {
      throw new NotFoundException('ไม่พบกะที่เปิดอยู่');
    }

    // คำนวณยอดขายเงินสดทั้งหมดในกะนี้ (totalAmount - discountAmount)
    const cashAgg = await this.prisma.order.aggregate({
      where: {
        shiftId: shift.id,
        paymentType: 'CASH',
        status: 'PAID',
      },
      _sum: { totalAmount: true, discountAmount: true },
    });

    const totalCashSales =
      (cashAgg._sum.totalAmount ?? 0) - (cashAgg._sum.discountAmount ?? 0);
    const expectedCash = shift.startingCash + totalCashSales;

    return this.prisma.shift.update({
      where: { id: shift.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: userId,
        actualCash: dto.actualCash,
        expectedCash,
        notes: dto.notes ?? null,
      },
    });
  }

  async getShiftSummary(branchId: number, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId, branchId },
      include: {
        openedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
      },
    });

    if (!shift) {
      throw new NotFoundException('ไม่พบกะที่ระบุ');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        shiftId: shift.id,
        status: 'PAID',
      },
      include: {
        items: true,
      },
    });

    let totalCashSales = 0;
    const itemMap = new Map<string, { qty: number; totalPrice: number }>();

    for (const order of orders) {
      if (order.paymentType === 'CASH') {
        totalCashSales += order.totalAmount - order.discountAmount;
      }
      for (const item of order.items) {
        const existing = itemMap.get(item.name) || { qty: 0, totalPrice: 0 };
        existing.qty += item.quantity;
        existing.totalPrice += item.quantity * item.price;
        itemMap.set(item.name, existing);
      }
    }

    const aggregatedItems = Array.from(itemMap.entries()).map(([name, data]) => ({
      name,
      qty: data.qty,
      totalPrice: data.totalPrice,
    }));

    return {
      branchName: shift.branch.name,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      openedByName: `${shift.openedBy.firstName} ${shift.openedBy.lastName}`,
      closedByName: shift.closedBy ? `${shift.closedBy.firstName} ${shift.closedBy.lastName}` : null,
      startingCash: shift.startingCash,
      actualCash: shift.actualCash,
      expectedCash: shift.expectedCash,
      shortOver: shift.actualCash !== null && shift.expectedCash !== null
        ? shift.actualCash - shift.expectedCash
        : null,
      totalCashSales,
      aggregatedItems,
    };
  }

  /** ใช้ภายในเมื่อสร้าง Order ใหม่เพื่อผูกกะอัตโนมัติ */
  async findOpenShiftId(branchId: number): Promise<string | null> {
    const shift = await this.getCurrentShift(branchId);
    return shift?.id ?? null;
  }
}
