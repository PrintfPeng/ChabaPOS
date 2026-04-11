import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBranchDto) {
    // Validate brand ownership
    const brand = await this.prisma.brand.findUnique({
      where: { id: dto.brandId },
    });

    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงแบรนด์นี้');

    return this.prisma.branch.create({
      data: dto,
    });
  }

  async findByBrand(userId: number, brandId: number) {
    // Validate brand ownership
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงแบรนด์นี้');

    return this.prisma.branch.findMany({
      where: { brandId },
    });
  }

  async findOne(userId: number, id: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return branch;
  }

  async update(userId: number, id: number, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');

    return this.prisma.branch.delete({
      where: { id },
    });
  }
}
