import {
  Controller, Get, Post, Patch, Body, Param,
  ParseIntPipe, Query, Inject, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, LookupAtTableDto } from './dto/customer.dto';
import { validateBody } from '../common/validate-body';
import { Public } from '../auth/public.decorator';

@Controller('customers')
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customersService: CustomersService) {}

  /**
   * ค้นหาสมาชิกจากหน้าสั่งอาหาร QR — ไม่ต้องล็อกอิน แต่ต้องมี QR ของโต๊ะ
   * POST เพราะเบอร์โทรไม่ควรไปโผล่ใน URL หรือ log ของ server
   */
  @Public()
  @Post('at-table')
  @HttpCode(HttpStatus.OK) // a lookup, not a creation
  lookupAtTable(@Body(validateBody(LookupAtTableDto)) dto: LookupAtTableDto) {
    return this.customersService.lookupAtTable(dto.qrCode, dto.phone);
  }

  /** ค้นหาลูกค้าจากเบอร์โทร — cashier ใช้ตอนชำระเงิน */
  @Get('lookup')
  lookup(
    @Request() req,
    @Query('phone') phone: string,
    @Query('branchId', ParseIntPipe) branchId: number,
  ) {
    return this.customersService.lookup(req.user.userId, phone, branchId);
  }

  /** รายชื่อสมาชิกทั้งหมด (admin) */
  @Get()
  findAll(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.customersService.findAll(req.user.userId, branchId);
  }

  /** รายละเอียดสมาชิก 1 คน */
  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(req.user.userId, id);
  }

  /** สมัครสมาชิกด่วน */
  @Post()
  create(@Request() req, @Body(validateBody(CreateCustomerDto)) dto: CreateCustomerDto) {
    return this.customersService.create(req.user.userId, dto);
  }

  /** แก้ไขข้อมูลสมาชิก */
  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body(validateBody(UpdateCustomerDto)) dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(req.user.userId, id, dto);
  }
}
