import { Injectable, ForbiddenException, NotFoundException, Inject, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async assertBrandOwner(userId: number, brandId: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: { userId: true },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงแบรนด์นี้');
  }

  private async assertBranchOwner(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { brandId: true, brand: { select: { userId: true } } },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
  }

  async create(userId: number, dto: CreateBranchDto) {
    await this.assertBrandOwner(userId, dto.brandId);
    return this.prisma.branch.create({ data: dto });
  }

  async findByBrand(userId: number, brandId: number) {
    await this.assertBrandOwner(userId, brandId);
    return this.prisma.branch.findMany({ where: { brandId } });
  }

  async findOne(userId: number, id: number) {
    await this.assertBranchOwner(userId, id);
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { brand: { select: { id: true, name: true, userId: true } } },
    });
    return branch;
  }

  async update(userId: number, id: number, dto: UpdateBranchDto) {
    await this.assertBranchOwner(userId, id);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(userId: number, id: number) {
    await this.assertBranchOwner(userId, id);
    return this.prisma.branch.delete({ where: { id } });
  }

  async getMenu(id: number) {
    return this.prisma.branch.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            items: {
              include: {
                optionGroups: {
                  include: {
                    options: true,
                  },
                },
                deliveryPrices: true,
              },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async getTables(id: number) {
    return this.prisma.table.findMany({
      where: { zone: { branchId: id } },
      include: { zone: true },
      orderBy: { name: 'asc' },
    });
  }

  async verifyPin(userId: number, id: number, pin: string) {
    await this.assertBranchOwner(userId, id);
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: { pin: true },
    });
    if (!branch?.pin || branch.pin !== pin) {
      throw new UnauthorizedException('รหัส PIN ไม่ถูกต้อง');
    }
    return { success: true };
  }
}
