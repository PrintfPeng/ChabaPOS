import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async lookup(phone: string, branchId: number) {
    return this.prisma.customer.findUnique({
      where: { phone_branchId: { phone, branchId } },
      include: {
        redemptions: {
          include: { promotion: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async findAll(branchId: number) {
    return this.prisma.customer.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        redemptions: {
          include: { promotion: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        orders: {
          where: { status: 'PAID' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { phone_branchId: { phone: dto.phone, branchId: dto.branchId } },
    });
    if (existing) throw new ConflictException('Phone number already registered in this branch');

    return this.prisma.customer.create({ data: dto });
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }
}
