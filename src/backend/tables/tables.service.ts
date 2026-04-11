import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import * as QRCode from 'qrcode';

@Injectable()
export class TablesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateTableDto) {
    const zone = await this.prisma.zone.findUnique({
      where: { id: dto.zoneId },
      include: { branch: { include: { brand: true } } },
    });
    if (!zone || zone.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงโซนนี้');

    return this.prisma.table.create({ data: dto });
  }

  async findAll(userId: number, zoneId: number) {
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      include: { branch: { include: { brand: true } } },
    });
    if (!zone || zone.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงโซนนี้');

    return this.prisma.table.findMany({ where: { zoneId } });
  }

  async update(userId: number, id: number, dto: UpdateTableDto) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { zone: { include: { branch: { include: { brand: true } } } } },
    });
    if (!table || table.zone.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขโต๊ะนี้');

    return this.prisma.table.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { zone: { include: { branch: { include: { brand: true } } } } },
    });
    if (!table || table.zone.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบโต๊ะนี้');

    return this.prisma.table.delete({ where: { id } });
  }

  async generateQRCode(userId: number, id: number) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { zone: { include: { branch: { include: { brand: true } } } } },
    });
    if (!table || table.zone.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงโต๊ะนี้');

    const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order?tableId=${table.qrCode}`;
    return QRCode.toDataURL(orderUrl);
  }
}
