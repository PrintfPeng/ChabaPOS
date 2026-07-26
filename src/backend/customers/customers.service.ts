import {
  Injectable, NotFoundException, ConflictException, InternalServerErrorException,
  ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TableAccessService } from '../common/table-access.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TableAccessService) private readonly tableAccess: TableAccessService,
  ) {}

  /**
   * Member lookup for a customer sitting at a table.
   *
   * Scoped by the table's QR code, so it cannot be used to sweep phone numbers
   * from outside the shop, and the branch comes from the table rather than the
   * request. Returns only what the ordering screen needs — no redemption
   * history, no order history. `null` means "not a member here"; sign-up is
   * staff-only, so the UI directs them to the counter.
   */
  async lookupAtTable(qrCode: string, phone: string) {
    const { branchId } = await this.tableAccess.resolve(qrCode);
    return this.prisma.customer.findUnique({
      where: { phone_branchId: { phone, branchId } },
      select: { id: true, name: true, phone: true, points: true },
    });
  }

  private async assertBranchOwner(userId: number, branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { brand: { select: { userId: true } } },
    });
    if (!branch || branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสาขานี้');
  }

  async lookup(userId: number, phone: string, branchId: number) {
    await this.assertBranchOwner(userId, branchId);
    try {
      return await this.prisma.customer.findUnique({
        where: { phone_branchId: { phone, branchId } },
        include: {
          redemptions: {
            include: { promotion: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    } catch (error) {
      console.error('[CustomersService.lookup] DB error:', error);
      throw new InternalServerErrorException('ไม่สามารถค้นหาสมาชิกได้');
    }
  }

  async findAll(userId: number, branchId: number) {
    await this.assertBranchOwner(userId, branchId);
    try {
      return await this.prisma.customer.findMany({
        where: { branchId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orders: true } } },
      });
    } catch (error) {
      console.error('[CustomersService.findAll] DB error:', error);
      throw new InternalServerErrorException('ไม่สามารถโหลดรายชื่อสมาชิกได้');
    }
  }

  async findOne(userId: number, id: number) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          branch: { include: { brand: { select: { userId: true } } } },
          redemptions: {
            include: { promotion: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          orders: {
            where: { status: 'PAID' },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              discountAmount: true,
              orderType: true,
              deliveryProvider: true,
              createdAt: true,
            },
          },
        },
      });
      if (!customer) throw new NotFoundException('Customer not found');
      if (customer.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิก');
      return customer;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      console.error('[CustomersService.findOne] DB error:', error);
      throw new InternalServerErrorException('ไม่สามารถโหลดข้อมูลสมาชิกได้');
    }
  }

  async create(userId: number, dto: CreateCustomerDto) {
    await this.assertBranchOwner(userId, dto.branchId);
    try {
      const existing = await this.prisma.customer.findUnique({
        where: { phone_branchId: { phone: dto.phone, branchId: dto.branchId } },
      });
      if (existing) throw new ConflictException('Phone number already registered in this branch');
      return await this.prisma.customer.create({ data: dto });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      console.error('[CustomersService.create] DB error:', error);
      throw new InternalServerErrorException('ไม่สามารถสร้างสมาชิกได้');
    }
  }

  async update(userId: number, id: number, dto: UpdateCustomerDto) {
    try {
      const existing = await this.prisma.customer.findUnique({
        where: { id },
        include: { branch: { include: { brand: { select: { userId: true } } } } },
      });
      if (!existing) throw new NotFoundException('Customer not found');
      if (existing.branch.brand.userId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิก');
      return await this.prisma.customer.update({ where: { id }, data: dto });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) throw error;
      console.error('[CustomersService.update] DB error:', error);
      throw new InternalServerErrorException('ไม่สามารถอัปเดตข้อมูลสมาชิกได้');
    }
  }
}
