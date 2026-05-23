import { Injectable, Inject, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateSupplierDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.supplier.create({ data: dto });
  }

  async findAll(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: true },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.supplier.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: number, id: number, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!supplier || supplier.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { branch: { include: { brand: true } } },
    });
    if (!supplier || supplier.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.supplier.delete({ where: { id } });
  }
}
