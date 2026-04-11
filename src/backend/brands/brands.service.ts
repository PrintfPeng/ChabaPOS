import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.brand.findMany({
      where: { userId },
      include: { _count: { select: { branches: true } } },
    });
  }

  async findOne(userId: number, id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงแบรนด์นี้');

    return brand;
  }

  async update(userId: number, id: number, dto: UpdateBrandDto) {
    await this.findOne(userId, id);
    return this.prisma.brand.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    return this.prisma.brand.delete({
      where: { id },
    });
  }
}
