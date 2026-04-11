import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateZoneDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.zone.create({ data: dto });
  }

  async findAll(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.zone.findMany({
      where: { branchId },
      include: { tables: true },
    });
  }

  async update(userId: number, id: number, dto: UpdateZoneDto) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!zone || zone.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขโซนนี้');

    return this.prisma.zone.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!zone || zone.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบโซนนี้');

    return this.prisma.zone.delete({ where: { id } });
  }
}
