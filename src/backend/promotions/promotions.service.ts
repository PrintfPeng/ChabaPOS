import {
  Injectable, NotFoundException, BadRequestException, Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TableAccessService } from '../common/table-access.service';
import {
  CreatePromotionDto, UpdatePromotionDto, ValidatePromotionDto,
} from './dto/promotion.dto';
import { assertBranchAccess } from '../common/branch-access.helper';

@Injectable()
export class PromotionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TableAccessService) private readonly tableAccess: TableAccessService,
  ) {}

  /** Active promotions for the branch whose table QR was scanned. */
  async findActiveAtTable(qrCode: string) {
    const { branchId } = await this.tableAccess.resolve(qrCode);
    return this.prisma.promotion.findMany({
      where: { branchId, isActive: true },
      include: { applicableItems: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Validate that every menu id belongs to the branch (prevents cross-branch targeting). */
  private async assertMenuIdsInBranch(branchId: number, menuIds: number[]) {
    if (!menuIds.length) return;
    const found = await this.prisma.menuItem.findMany({
      where:  { id: { in: menuIds }, branchId },
      select: { id: true },
    });
    if (found.length !== menuIds.length) {
      throw new BadRequestException('เมนูบางรายการไม่ได้อยู่ในสาขานี้');
    }
  }

  // A2-2: delegates to shared helper — allows both owner and assigned staff
  private assertBranchOwner(userId: number, branchId: number) {
    return assertBranchAccess(this.prisma, userId, branchId);
  }

  async findAll(userId: number, branchId: number, activeOnly = false) {
    await this.assertBranchOwner(userId, branchId);
    return this.prisma.promotion.findMany({
      where: {
        branchId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: { applicableItems: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
      include: { applicableItems: { select: { id: true } } },
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async create(userId: number, dto: CreatePromotionDto) {
    await this.assertBranchOwner(userId, dto.branchId);

    const targetType = dto.targetType ?? 'ENTIRE_ORDER';
    const menuIds    = targetType === 'SPECIFIC_ITEMS' ? (dto.menuIds ?? []) : [];
    if (targetType === 'SPECIFIC_ITEMS') {
      if (!menuIds.length) throw new BadRequestException('กรุณาเลือกเมนูอย่างน้อย 1 รายการ');
      await this.assertMenuIdsInBranch(dto.branchId, menuIds);
    }

    return this.prisma.promotion.create({
      data: {
        name:         dto.name,
        code:         dto.code ?? null,
        type:         dto.type,
        value:        dto.value,
        targetType,
        minSpend:     dto.minSpend ?? 0,
        pointsNeeded: dto.pointsNeeded ?? 0,
        memberOnly:   dto.memberOnly ?? false,
        isActive:     dto.isActive ?? true,
        startDate:    dto.startDate ? new Date(dto.startDate) : null,
        endDate:      dto.endDate   ? new Date(dto.endDate)   : null,
        branchId:     dto.branchId,
        ...(menuIds.length ? { applicableItems: { connect: menuIds.map(mid => ({ id: mid })) } } : {}),
      },
      include: { applicableItems: { select: { id: true } } },
    });
  }

  async update(userId: number, id: number, dto: UpdatePromotionDto) {
    const promo = await this.findOne(id);
    await this.assertBranchOwner(userId, promo.branchId);

    // menuIds is a relation, not a scalar column — pull it out of the spread
    const { menuIds, startDate, endDate, ...rest } = dto;

    let applicableItems: { set: { id: number }[] } | undefined;
    if (menuIds !== undefined) {
      await this.assertMenuIdsInBranch(promo.branchId, menuIds);
      applicableItems = { set: menuIds.map(mid => ({ id: mid })) };   // replaces the whole set
    }

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate   ? { endDate:   new Date(endDate) }   : {}),
        ...(applicableItems ? { applicableItems } : {}),
      },
      include: { applicableItems: { select: { id: true } } },
    });
  }

  async toggle(userId: number, id: number) {
    const promo = await this.findOne(id);
    await this.assertBranchOwner(userId, promo.branchId);
    return this.prisma.promotion.update({
      where: { id },
      data: { isActive: !promo.isActive },
    });
  }

  async remove(userId: number, id: number) {
    const promo = await this.findOne(id);
    await this.assertBranchOwner(userId, promo.branchId);
    return this.prisma.promotion.delete({ where: { id } });
  }

  /**
   * Condition Checker — ตรวจสอบเงื่อนไขก่อนใช้โปรโมชั่น
   * คืนค่า discountAmount ที่คำนวณแล้ว
   */
  async validate(userId: number, dto: ValidatePromotionDto) {
    await this.assertBranchOwner(userId, dto.branchId);
    return this.checkAndPrice(dto.branchId, dto.promotionId, dto.totalAmount, dto.customerId, dto.items);
  }

  /** Same check, reached from the QR page — scoped by the table's QR code. */
  async validateAtTable(
    qrCode: string,
    promotionId: number,
    totalAmount: number,
    customerId?: number,
    lineItems?: { menuItemId: number; lineTotal: number }[],
  ) {
    const { branchId } = await this.tableAccess.resolve(qrCode);
    return this.checkAndPrice(branchId, promotionId, totalAmount, customerId, lineItems);
  }

  /**
   * The rules themselves, with no assumption about who is asking. Callers are
   * responsible for establishing that branchId is legitimate first — either by
   * ownership (staff) or by resolving a table QR code (customer).
   */
  async checkAndPrice(
    branchId: number,
    promotionId: number,
    totalAmount: number,
    customerId?: number,
    /** Order line items (menuItemId + line total incl. options) — required to price
     *  a SPECIFIC_ITEMS promotion; ignored for ENTIRE_ORDER promotions. */
    lineItems?: { menuItemId: number; lineTotal: number }[],
  ) {
    const promo = await this.prisma.promotion.findFirst({
      where: { id: promotionId, branchId, isActive: true },
      include: { applicableItems: { select: { id: true } } },
    });
    if (!promo) throw new NotFoundException('โปรโมชั่นนี้ไม่พบหรือถูกปิดใช้งานแล้ว');

    const now = new Date();
    if (promo.startDate && now < promo.startDate)
      throw new BadRequestException('โปรโมชั่นนี้ยังไม่เริ่มต้น');
    if (promo.endDate && now > promo.endDate)
      throw new BadRequestException('โปรโมชั่นนี้หมดอายุแล้ว');
    if (totalAmount < promo.minSpend)
      throw new BadRequestException(
        `ยอดชำระขั้นต่ำ ฿${promo.minSpend.toLocaleString()} เพื่อใช้โปรโมชั่นนี้`,
      );
    if (promo.memberOnly && !customerId)
      throw new BadRequestException('โปรโมชั่นนี้สำหรับสมาชิกเท่านั้น กรุณาค้นหาสมาชิกก่อน');

    if (promo.type === 'POINTS_REDEMPTION') {
      if (!customerId)
        throw new BadRequestException('กรุณาค้นหาสมาชิกก่อนแลกแต้ม');
      // Pinned to this branch so a customer id from elsewhere cannot be spent here.
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, branchId },
      });
      if (!customer)
        throw new NotFoundException('ไม่พบข้อมูลสมาชิก');
      if (customer.points < promo.pointsNeeded)
        throw new BadRequestException(
          `แต้มไม่พอ (มี ${customer.points} แต้ม ต้องการ ${promo.pointsNeeded} แต้ม)`,
        );
    }

    // ── Discount base ──────────────────────────────────────────────────────
    // ENTIRE_ORDER: discount the whole bill. SPECIFIC_ITEMS: discount only the
    // sum of the applicable menu items' line totals present in this order.
    let base = totalAmount;
    if (promo.targetType === 'SPECIFIC_ITEMS') {
      const applicableIds = new Set(promo.applicableItems.map(m => m.id));
      base = (lineItems ?? [])
        .filter(li => applicableIds.has(li.menuItemId))
        .reduce((sum, li) => sum + li.lineTotal, 0);
      if (base <= 0) {
        throw new BadRequestException('ออเดอร์นี้ไม่มีเมนูที่เข้าร่วมโปรโมชั่น');
      }
    }

    let discountAmount = 0;
    if (promo.type === 'PERCENT')
      discountAmount = (base * promo.value) / 100;
    else
      discountAmount = promo.value;

    // Cap to the applicable base, then never let it exceed the whole bill.
    discountAmount = Math.min(discountAmount, base);
    discountAmount = Math.min(discountAmount, totalAmount);

    return {
      valid:          true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount:    Math.round((totalAmount - discountAmount) * 100) / 100,
      promotion:      promo,
    };
  }
}
