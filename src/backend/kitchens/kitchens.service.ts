import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKitchenDto } from './dto/create-kitchen.dto';

@Injectable()
export class KitchensService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateKitchenDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException();

    return this.prisma.kitchen.create({ data: dto });
  }

  async findAll(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.kitchen.findMany({ where: { branchId } });
  }

  async update(userId: number, id: number, dto: any) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!kitchen || kitchen.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขห้องครัวนี้');

    return this.prisma.kitchen.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!kitchen || kitchen.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบห้องครัวนี้');

    return this.prisma.kitchen.delete({ where: { id } });
  }
}
