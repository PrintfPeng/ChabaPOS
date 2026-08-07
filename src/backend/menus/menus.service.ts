import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, CreateMenuItemDto, CreateDeliveryPlatformDto } from './dto/menu.dto';
import { UpdateCategoryDto, UpdateMenuItemDto, UpdateDeliveryPlatformDto } from './dto/update-menu.dto';
import { assertBranchAccess } from '../common/branch-access.helper';

@Injectable()
export class MenusService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  async createCategory(userId: number, dto: CreateCategoryDto) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, dto.branchId);

    const existing = await this.prisma.category.findFirst({
      where: { name: dto.name, branchId: dto.branchId },
    });
    if (existing) throw new BadRequestException('ชื่อหมวดหมู่นี้มีอยู่ในระบบ');

    return this.prisma.category.create({ data: dto });
  }

  async findAllCategories(userId: number, branchId: number) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, branchId);
    return this.prisma.category.findMany({
      where:   { branchId },
      orderBy: { order: 'asc' },
    });
  }

  async updateCategory(userId: number, id: number, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where:  { id },
      select: { id: true, branchId: true },
    });
    if (!category) throw new NotFoundException('ไม่พบหมวดหมู่นี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, category.branchId);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async removeCategory(userId: number, id: number) {
    const category = await this.prisma.category.findUnique({
      where:  { id },
      select: { id: true, branchId: true },
    });
    if (!category) throw new NotFoundException('ไม่พบหมวดหมู่นี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, category.branchId);
    return this.prisma.category.delete({ where: { id } });
  }

  // ─── Delivery Platforms ───────────────────────────────────────────────────

  async createDeliveryPlatform(userId: number, dto: CreateDeliveryPlatformDto) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, dto.branchId);

    const existing = await this.prisma.deliveryPlatform.findFirst({
      where: { name: dto.name, branchId: dto.branchId },
    });
    if (existing) throw new BadRequestException('มีแพลตฟอร์มชื่อนี้ในสาขานี้แล้ว');

    return this.prisma.deliveryPlatform.create({ data: dto });
  }

  async findAllDeliveryPlatforms(userId: number, branchId: number) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, branchId);
    return this.prisma.deliveryPlatform.findMany({
      where:   { branchId },
      orderBy: { id: 'asc' },
    });
  }

  async updateDeliveryPlatform(userId: number, id: number, dto: UpdateDeliveryPlatformDto) {
    const platform = await this.prisma.deliveryPlatform.findUnique({
      where:  { id },
      select: { id: true, branchId: true },
    });
    if (!platform) throw new NotFoundException('ไม่พบแพลตฟอร์มนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, platform.branchId);
    return this.prisma.deliveryPlatform.update({ where: { id }, data: dto });
  }

  async removeDeliveryPlatform(userId: number, id: number) {
    const platform = await this.prisma.deliveryPlatform.findUnique({
      where:  { id },
      select: { id: true, branchId: true },
    });
    if (!platform) throw new NotFoundException('ไม่พบแพลตฟอร์มนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, platform.branchId);
    return this.prisma.deliveryPlatform.delete({ where: { id } });
  }

  // ─── Menu Items ───────────────────────────────────────────────────────────

  async createMenuItem(userId: number, dto: CreateMenuItemDto) {
    if (!dto.categoryId || !dto.kitchenId) {
      throw new BadRequestException('กรุณาระบุหมวดหมู่และห้องครัวให้ครบถ้วน');
    }

    const { optionGroupIds, deliveryPrices, ...data } = dto;

    // A2-2
    await assertBranchAccess(this.prisma, userId, dto.branchId);

    const existing = await this.prisma.menuItem.findFirst({
      where: { name: dto.name, branchId: dto.branchId },
    });
    if (existing) throw new BadRequestException('ชื่อเมนูนี้มีอยู่ในระบบ');

    // A1-9: verify all optionGroupIds belong to this branch
    if (optionGroupIds && optionGroupIds.length > 0) {
      const validGroups = await this.prisma.optionGroup.findMany({
        where:  { id: { in: optionGroupIds }, branchId: dto.branchId },
        select: { id: true },
      });
      if (validGroups.length !== optionGroupIds.length) {
        throw new BadRequestException('กลุ่มตัวเลือกบางรายการไม่ได้อยู่ในสาขานี้');
      }
    }

    return this.prisma.menuItem.create({
      data: {
        ...data,
        optionGroups: optionGroupIds
          ? { connect: optionGroupIds.map(id => ({ id })) }
          : undefined,
        deliveryPrices: deliveryPrices && deliveryPrices.length > 0
          ? { create: deliveryPrices.map(dp => ({ deliveryPlatformId: dp.platformId, price: dp.price })) }
          : undefined,
      },
      include: {
        optionGroups: { include: { options: true } },
        deliveryPrices: true,
      },
    });
  }

  async findAllMenuItems(userId: number, branchId: number) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, branchId);
    return this.prisma.menuItem.findMany({
      where:   { branchId },
      include: {
        category:       true,
        kitchen:        true,
        optionGroups:   { include: { options: true } },
        deliveryPrices: true,
      },
    });
  }

  async updateMenuItem(userId: number, id: number, dto: UpdateMenuItemDto) {
    const { optionGroupIds, deliveryPrices, ...data } = dto;

    const item = await this.prisma.menuItem.findUnique({
      where:  { id },
      select: { id: true, branchId: true },
    });
    if (!item) throw new NotFoundException('ไม่พบเมนูนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, item.branchId);

    // A1-9: verify all optionGroupIds belong to this branch
    if (optionGroupIds && optionGroupIds.length > 0) {
      const validGroups = await this.prisma.optionGroup.findMany({
        where:  { id: { in: optionGroupIds }, branchId: item.branchId },
        select: { id: true },
      });
      if (validGroups.length !== optionGroupIds.length) {
        throw new BadRequestException('กลุ่มตัวเลือกบางรายการไม่ได้อยู่ในสาขานี้');
      }
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...data,
        optionGroups: optionGroupIds
          ? { set: optionGroupIds.map(id => ({ id })) }
          : undefined,
        deliveryPrices: deliveryPrices !== undefined
          ? {
              deleteMany: {},
              create: deliveryPrices.map(dp => ({ deliveryPlatformId: dp.platformId, price: dp.price })),
            }
          : undefined,
      },
      include: {
        optionGroups: { include: { options: true } },
        deliveryPrices: true,
      },
    });
  }

  async bulkUpdateDeliveryStatus(userId: number, branchId: number, enabledIds: number[]) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, branchId);

    const ops: any[] = [
      this.prisma.menuItem.updateMany({
        where: { branchId },
        data:  { isDeliveryAvailable: false },
      }),
    ];
    if (enabledIds.length > 0) {
      ops.push(
        this.prisma.menuItem.updateMany({
          where: { branchId, id: { in: enabledIds } },
          data:  { isDeliveryAvailable: true },
        }),
      );
    }
    await this.prisma.$transaction(ops);
    return { success: true };
  }

  async removeMenuItem(userId: number, id: number) {
    const item = await this.prisma.menuItem.findUnique({
      where:  { id },
      select: { id: true, branchId: true },
    });
    if (!item) throw new NotFoundException('ไม่พบเมนูนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, item.branchId);
    return this.prisma.menuItem.delete({ where: { id } });
  }
}
