import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialCategoryDto, UpdateMaterialCategoryDto } from './dto/material-category.dto';

@Injectable()
export class MaterialCategoriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateMaterialCategoryDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.materialCategory.create({
      data: { name: dto.name, branchId: dto.branchId },
    });
  }

  async findAll(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.materialCategory.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: number, id: number, dto: UpdateMaterialCategoryDto) {
    const category = await this.prisma.materialCategory.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!category || category.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.materialCategory.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(userId: number, id: number) {
    const category = await this.prisma.materialCategory.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!category || category.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.materialCategory.delete({ where: { id } });
  }
}
