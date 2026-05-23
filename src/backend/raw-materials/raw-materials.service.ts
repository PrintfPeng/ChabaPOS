import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto, UpdateRawMaterialDto } from './dto/raw-material.dto';

@Injectable()
export class RawMaterialsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateRawMaterialDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.rawMaterial.create({ data: dto });
  }

  async findAll(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.rawMaterial.findMany({
      where: { branchId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: number, id: number, dto: UpdateRawMaterialDto) {
    const material = await this.prisma.rawMaterial.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!material || material.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.rawMaterial.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    const material = await this.prisma.rawMaterial.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!material || material.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.rawMaterial.delete({ where: { id } });
  }
}
