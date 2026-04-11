import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, CreateMenuItemDto } from './dto/menu.dto';
import { UpdateCategoryDto, UpdateMenuItemDto } from './dto/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Categories
  async createCategory(userId: number, dto: CreateCategoryDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.category.create({ data: dto });
  }

  async findAllCategories(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.category.findMany({
      where: { branchId },
      orderBy: { order: 'asc' },
    });
  }

  async updateCategory(userId: number, id: number, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!category || category.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขหมวดหมู่นี้');

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async removeCategory(userId: number, id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!category || category.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบหมวดหมู่นี้');

    return this.prisma.category.delete({ where: { id } });
  }

  // Menu Items
  async createMenuItem(userId: number, dto: CreateMenuItemDto) {
    const { optionGroupIds, ...data } = dto;
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.menuItem.create({
      data: {
        ...data,
        optionGroups: optionGroupIds ? {
          connect: optionGroupIds.map(id => ({ id }))
        } : undefined
      },
      include: {
        optionGroups: {
          include: {
            options: true
          }
        }
      }
    });
  }

  async findAllMenuItems(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.menuItem.findMany({
      where: { branchId },
      include: { 
        category: true, 
        kitchen: true,
        optionGroups: {
          include: {
            options: true
          }
        }
      },
    });
  }

  async updateMenuItem(userId: number, id: number, dto: UpdateMenuItemDto) {
    const { optionGroupIds, ...data } = dto;
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!item || item.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขเมนูนี้');

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...data,
        optionGroups: optionGroupIds ? {
          set: optionGroupIds.map(id => ({ id }))
        } : undefined
      },
      include: {
        optionGroups: {
          include: {
            options: true
          }
        }
      }
    });
  }

  async removeMenuItem(userId: number, id: number) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!item || item.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบเมนูนี้');

    return this.prisma.menuItem.delete({ where: { id } });
  }
}
