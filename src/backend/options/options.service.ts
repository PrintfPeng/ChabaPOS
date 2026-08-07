import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOptionGroupDto, CreateOptionDto } from './dto/option.dto';
import { UpdateOptionGroupDto, UpdateOptionDto } from './dto/update-option.dto';
import { assertBranchAccess } from '../common/branch-access.helper';

@Injectable()
export class OptionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createGroup(userId: number, dto: CreateOptionGroupDto) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, dto.branchId);
    return this.prisma.optionGroup.create({ data: dto });
  }

  async findAllGroups(userId: number, branchId: number) {
    // A2-2
    await assertBranchAccess(this.prisma, userId, branchId);
    return this.prisma.optionGroup.findMany({
      where:   { branchId },
      include: { options: true, menuItems: true },
    });
  }

  async updateGroup(userId: number, id: number, dto: UpdateOptionGroupDto) {
    const group = await this.prisma.optionGroup.findUnique({
      where:  { id },
      select: { id: true, branchId: true },
    });
    if (!group) throw new NotFoundException('ไม่พบกลุ่มตัวเลือกนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, group.branchId);

    const { menuItemIds, ...data } = dto;

    // A1-8: verify all menuItemIds belong to this branch before linking them
    if (menuItemIds && menuItemIds.length > 0) {
      const validItems = await this.prisma.menuItem.findMany({
        where:  { id: { in: menuItemIds }, branchId: group.branchId },
        select: { id: true },
      });
      if (validItems.length !== menuItemIds.length) {
        throw new BadRequestException('เมนูบางรายการไม่ได้อยู่ในสาขานี้');
      }
    }

    return this.prisma.optionGroup.update({
      where: { id },
      data: {
        ...data,
        menuItems: menuItemIds ? { set: menuItemIds.map(mid => ({ id: mid })) } : undefined,
      },
    });
  }

  async removeGroup(userId: number, id: number) {
    const group = await this.prisma.optionGroup.findUnique({
      where:  { id },
      select: { id: true, branchId: true },
    });
    if (!group) throw new NotFoundException('ไม่พบกลุ่มตัวเลือกนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, group.branchId);
    return this.prisma.optionGroup.delete({ where: { id } });
  }

  async createOption(userId: number, dto: CreateOptionDto) {
    const group = await this.prisma.optionGroup.findUnique({
      where:  { id: dto.optionGroupId },
      select: { id: true, branchId: true },
    });
    if (!group) throw new NotFoundException('ไม่พบกลุ่มตัวเลือกนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, group.branchId);
    return this.prisma.option.create({ data: dto });
  }

  async updateOption(userId: number, id: number, dto: UpdateOptionDto) {
    const option = await this.prisma.option.findUnique({
      where:   { id },
      include: { optionGroup: { select: { branchId: true } } },
    });
    if (!option) throw new NotFoundException('ไม่พบตัวเลือกนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, option.optionGroup.branchId);
    return this.prisma.option.update({ where: { id }, data: dto });
  }

  async removeOption(userId: number, id: number) {
    const option = await this.prisma.option.findUnique({
      where:   { id },
      include: { optionGroup: { select: { branchId: true } } },
    });
    if (!option) throw new NotFoundException('ไม่พบตัวเลือกนี้');

    // A2-2
    await assertBranchAccess(this.prisma, userId, option.optionGroup.branchId);
    return this.prisma.option.delete({ where: { id } });
  }
}
