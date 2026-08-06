import {
  Injectable, ForbiddenException, NotFoundException, Inject, UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

const PIN_SALT_ROUNDS = 10;

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
    const data: any = { ...dto };
    // C4: hash PIN before persisting if provided at creation time
    if (data.pin) {
      data.pin = await bcrypt.hash(data.pin, PIN_SALT_ROUNDS);
    }
    return this.prisma.branch.create({ data });
  }

  async findByBrand(userId: number, brandId: number) {
    await this.assertBrandOwner(userId, brandId);
    return this.prisma.branch.findMany({ where: { brandId } });
  }

  async findOne(userId: number, id: number) {
    await this.assertBranchOwner(userId, id);
    return this.prisma.branch.findUnique({
      where: { id },
      include: { brand: { select: { id: true, name: true, userId: true } } },
    });
  }

  async update(userId: number, id: number, dto: UpdateBranchDto) {
    await this.assertBranchOwner(userId, id);
    const data: any = { ...dto };
    // FIX C4: hash the new PIN before writing to the database
    if (data.pin) {
      data.pin = await bcrypt.hash(data.pin, PIN_SALT_ROUNDS);
    }
    return this.prisma.branch.update({ where: { id }, data });
  }

  async remove(userId: number, id: number) {
    await this.assertBranchOwner(userId, id);

    const openShift = await this.prisma.shift.findFirst({
      where: { branchId: id, status: 'OPEN' },
    });
    if (openShift) {
      throw new BadRequestException('ไม่สามารถลบสาขาได้ มีกะที่ยังเปิดอยู่ กรุณาปิดกะก่อน');
    }

    // FIX H5: refuse to delete a branch that has occupied tables
    const occupiedCount = await this.prisma.table.count({
      where: { zone: { branchId: id }, status: 'OCCUPIED' },
    });
    if (occupiedCount > 0) {
      throw new BadRequestException(
        `ไม่สามารถลบสาขาได้ มีโต๊ะที่มีลูกค้าอยู่ ${occupiedCount} โต๊ะ กรุณาชำระเงินก่อน`,
      );
    }

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
                optionGroups: { include: { options: true } },
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
      where:   { zone: { branchId: id } },
      include: { zone: true },
      orderBy: { name: 'asc' },
    });
  }

  /** FIX C4: Compares against the bcrypt hash stored in DB, not plaintext. */
  async verifyPin(userId: number, id: number, pin: string) {
    await this.assertBranchOwner(userId, id);
    const branch = await this.prisma.branch.findUnique({
      where:  { id },
      select: { pin: true },
    });
    if (!branch?.pin) {
      throw new UnauthorizedException('สาขานี้ยังไม่ได้ตั้งรหัส PIN');
    }
    const valid = await bcrypt.compare(pin, branch.pin);
    if (!valid) {
      throw new UnauthorizedException('รหัส PIN ไม่ถูกต้อง');
    }
    return { success: true };
  }
}
