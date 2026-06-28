import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto, UpdateRawMaterialDto, UpdateStockDto } from './dto/raw-material.dto';

@Injectable()
export class RawMaterialsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateRawMaterialDto) {
    await this.assertBranchOwner(userId, dto.branchId);
    return this.prisma.rawMaterial.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        categoryId: dto.categoryId,
        branchId: dto.branchId,
        stock: dto.stock ?? 0,
      },
      include: { category: true },
    });
  }

  async findAll(userId: number, branchId: number) {
    await this.assertBranchOwner(userId, branchId);
    return this.prisma.rawMaterial.findMany({
      where: { branchId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: number, id: number, dto: UpdateRawMaterialDto) {
    await this.assertMaterialOwner(userId, id);
    return this.prisma.rawMaterial.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async updateStock(userId: number, id: number, dto: UpdateStockDto) {
    await this.assertMaterialOwner(userId, id);
    return this.prisma.rawMaterial.update({
      where: { id },
      data: { stock: dto.stock },
      include: { category: true },
    });
  }

  async remove(userId: number, id: number) {
    await this.assertMaterialOwner(userId, id);
    return this.prisma.rawMaterial.delete({ where: { id } });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async assertBranchOwner(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
    }
  }

  private async assertMaterialOwner(userId: number, materialId: number) {
    const material = await this.prisma.rawMaterial.findUnique({
      where: { id: materialId },
      include: { branch: { include: { brand: true } } },
    });
    if (!material) throw new NotFoundException('ไม่พบวัตถุดิบ');
    if (material.branch.brand.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
    }
  }
}
