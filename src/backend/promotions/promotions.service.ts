import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePromotionDto, UpdatePromotionDto, ValidatePromotionDto,
} from './dto/promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async assertBranchOwner(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: { select: { userId: true } } },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
  }

  async findAll(userId: number, branchId: number, activeOnly = false) {
    await this.assertBranchOwner(userId, branchId);
    return this.prisma.promotion.findMany({
      where: {
        branchId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async create(userId: number, dto: CreatePromotionDto) {
    await this.assertBranchOwner(userId, dto.branchId);
    return this.prisma.promotion.create({
      data: {
        name:         dto.name,
        code:         dto.code ?? null,
        type:         dto.type,
        value:        dto.value,
        minSpend:     dto.minSpend ?? 0,
        pointsNeeded: dto.pointsNeeded ?? 0,
        memberOnly:   dto.memberOnly ?? false,
        isActive:     dto.isActive ?? true,
        startDate:    dto.startDate ? new Date(dto.startDate) : null,
        endDate:      dto.endDate   ? new Date(dto.endDate)   : null,
        branchId:     dto.branchId,
      },
    });
  }

  async update(userId: number, id: number, dto: UpdatePromotionDto) {
    const promo = await this.findOne(id);
    await this.assertBranchOwner(userId, promo.branchId);
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:   dto.endDate   ? new Date(dto.endDate)   : undefined,
      },
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
    const promo = await this.prisma.promotion.findFirst({
      where: { id: dto.promotionId, branchId: dto.branchId, isActive: true },
    });
    if (!promo) throw new NotFoundException('โปรโมชั่นนี้ไม่พบหรือถูกปิดใช้งานแล้ว');

    const now = new Date();
    if (promo.startDate && now < promo.startDate)
      throw new BadRequestException('โปรโมชั่นนี้ยังไม่เริ่มต้น');
    if (promo.endDate && now > promo.endDate)
      throw new BadRequestException('โปรโมชั่นนี้หมดอายุแล้ว');
    if (dto.totalAmount < promo.minSpend)
      throw new BadRequestException(
        `ยอดชำระขั้นต่ำ ฿${promo.minSpend.toLocaleString()} เพื่อใช้โปรโมชั่นนี้`,
      );
    if (promo.memberOnly && !dto.customerId)
      throw new BadRequestException('โปรโมชั่นนี้สำหรับสมาชิกเท่านั้น กรุณาค้นหาสมาชิกก่อน');

    if (promo.type === 'POINTS_REDEMPTION') {
      if (!dto.customerId)
        throw new BadRequestException('กรุณาค้นหาสมาชิกก่อนแลกแต้ม');
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer)
        throw new NotFoundException('ไม่พบข้อมูลสมาชิก');
      if (customer.points < promo.pointsNeeded)
        throw new BadRequestException(
          `แต้มไม่พอ (มี ${customer.points} แต้ม ต้องการ ${promo.pointsNeeded} แต้ม)`,
        );
    }

    let discountAmount = 0;
    if (promo.type === 'PERCENT')
      discountAmount = (dto.totalAmount * promo.value) / 100;
    else
      discountAmount = promo.value;

    discountAmount = Math.min(discountAmount, dto.totalAmount);

    return {
      valid:          true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount:    Math.round((dto.totalAmount - discountAmount) * 100) / 100,
      promotion:      promo,
    };
  }
}
