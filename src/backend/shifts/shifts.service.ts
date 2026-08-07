import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { assertBranchAccess } from '../common/branch-access.helper';

@Injectable()
export class ShiftsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // A2-2: delegates to shared helper — allows both owner and assigned staff
  private assertBranchOwner(userId: number, branchId: number) {
    return assertBranchAccess(this.prisma, userId, branchId);
  }

  // Internal helper — no auth check; used by closeShift and findOpenShiftId
  private async findOpenShift(branchId: number) {
    return this.prisma.shift.findFirst({
      where: { branchId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
  }

  // A1-7 + A2-5: now requires userId for ownership verification
  async getCurrentShift(userId: number, branchId: number) {
    await this.assertBranchOwner(userId, branchId);
    return this.findOpenShift(branchId);
  }

  async openShift(branchId: number, userId: number, dto: OpenShiftDto) {
    await this.assertBranchOwner(userId, branchId);

    // A3-1: Serializable transaction eliminates the TOCTOU race where two concurrent
    // openShift calls both pass the "no open shift" check then create duplicates.
    // The DB-level snapshot ensures the second caller sees the committed shift.
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.shift.findFirst({
          where: { branchId, status: 'OPEN' },
        });
        if (existing) {
          throw new BadRequestException('มีกะที่เปิดอยู่แล้ว กรุณาปิดกะเดิมก่อน');
        }

        return tx.shift.create({
          data: {
            branchId,
            openedById:   userId,
            startingCash: dto.startingCash,
            status:       'OPEN',
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async closeShift(branchId: number, userId: number, dto: CloseShiftDto) {
    await this.assertBranchOwner(userId, branchId);

    const shift = await this.findOpenShift(branchId);
    if (!shift) {
      throw new NotFoundException('ไม่พบกะที่เปิดอยู่');
    }

    const cashAgg = await this.prisma.order.aggregate({
      where: {
        shiftId:     shift.id,
        paymentType: 'CASH',
        status:      'PAID',
      },
      _sum: { totalAmount: true, discountAmount: true },
    });

    const totalCashSales =
      (cashAgg._sum.totalAmount ?? 0) - (cashAgg._sum.discountAmount ?? 0);
    const expectedCash = shift.startingCash + totalCashSales;

    return this.prisma.shift.update({
      where: { id: shift.id },
      data: {
        status:     'CLOSED',
        closedAt:   new Date(),
        closedById: userId,
        actualCash: dto.actualCash,
        expectedCash,
        notes:      dto.notes ?? null,
      },
    });
  }

  // A1-7 + A2-5: now requires userId for ownership verification
  async getShiftSummary(userId: number, branchId: number, shiftId: string) {
    await this.assertBranchOwner(userId, branchId);

    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId, branchId },
      include: {
        openedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
        branch:   { select: { name: true } },
      },
    });

    if (!shift) {
      throw new NotFoundException('ไม่พบกะที่ระบุ');
    }

    const orders = await this.prisma.order.findMany({
      where:   { shiftId: shift.id, status: 'PAID' },
      include: { items: true },
    });

    let totalCashSales = 0;
    const itemMap = new Map<string, { qty: number; totalPrice: number }>();

    for (const order of orders) {
      if (order.paymentType === 'CASH') {
        totalCashSales += order.totalAmount - order.discountAmount;
      }
      for (const item of order.items) {
        const existing = itemMap.get(item.name) || { qty: 0, totalPrice: 0 };
        existing.qty        += item.quantity;
        existing.totalPrice += item.quantity * item.price;
        itemMap.set(item.name, existing);
      }
    }

    const aggregatedItems = Array.from(itemMap.entries()).map(([name, data]) => ({
      name,
      qty:        data.qty,
      totalPrice: data.totalPrice,
    }));

    return {
      branchName:  shift.branch.name,
      openedAt:    shift.openedAt,
      closedAt:    shift.closedAt,
      openedByName: `${shift.openedBy.firstName} ${shift.openedBy.lastName}`,
      closedByName: shift.closedBy
        ? `${shift.closedBy.firstName} ${shift.closedBy.lastName}`
        : null,
      startingCash: shift.startingCash,
      actualCash:   shift.actualCash,
      expectedCash: shift.expectedCash,
      shortOver:    shift.actualCash !== null && shift.expectedCash !== null
        ? shift.actualCash - shift.expectedCash
        : null,
      totalCashSales,
      aggregatedItems,
    };
  }

  /** Internal — used by OrdersService to link new orders to the open shift */
  async findOpenShiftId(branchId: number): Promise<string | null> {
    const shift = await this.findOpenShift(branchId);
    return shift?.id ?? null;
  }
}
