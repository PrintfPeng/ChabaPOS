import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOptionGroupDto, CreateOptionDto } from './dto/option.dto';
import { UpdateOptionGroupDto, UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class OptionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createGroup(userId: number, dto: CreateOptionGroupDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.optionGroup.create({ data: dto });
  }

  async findAllGroups(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.optionGroup.findMany({
      where: { branchId },
      include: { options: true, menuItems: true },
    });
  }

  async updateGroup(userId: number, id: number, dto: UpdateOptionGroupDto) {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!group || group.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขกลุ่มตัวเลือกนี้');

    const { menuItemIds, ...data } = dto;

    return this.prisma.optionGroup.update({
      where: { id },
      data: {
        ...data,
        menuItems: menuItemIds ? {
          set: menuItemIds.map(id => ({ id })),
        } : undefined,
      },
    });
  }

  async removeGroup(userId: number, id: number) {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!group || group.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบกลุ่มตัวเลือกนี้');

    return this.prisma.optionGroup.delete({ where: { id } });
  }

  async createOption(userId: number, dto: CreateOptionDto) {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id: dto.optionGroupId },
      include: { branch: { include: { brand: true } } },
    });
    if (!group || group.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงกลุ่มตัวเลือกนี้');

    return this.prisma.option.create({ data: dto });
  }

  async updateOption(userId: number, id: number, dto: UpdateOptionDto) {
    const option = await this.prisma.option.findUnique({
      where: { id },
      include: { optionGroup: { include: { branch: { include: { brand: true } } } } },
    });
    if (!option || option.optionGroup.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขตัวเลือกนี้');

    return this.prisma.option.update({
      where: { id },
      data: dto,
    });
  }

  async removeOption(userId: number, id: number) {
    const option = await this.prisma.option.findUnique({
      where: { id },
      include: { optionGroup: { include: { branch: { include: { brand: true } } } } },
    });
    if (!option || option.optionGroup.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบตัวเลือกนี้');

    return this.prisma.option.delete({ where: { id } });
  }
}
