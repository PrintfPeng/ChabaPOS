import {
  Controller, Get, Post, Patch, Body, Param,
  ParseIntPipe, Query, Inject,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customersService: CustomersService) {}

  /** ค้นหาลูกค้าจากเบอร์โทร — cashier ใช้ตอนชำระเงิน */
  @Get('lookup')
  lookup(
    @Query('phone') phone: string,
    @Query('branchId', ParseIntPipe) branchId: number,
  ) {
    return this.customersService.lookup(phone, branchId);
  }

  /** รายชื่อสมาชิกทั้งหมด (admin) */
  @Get()
  findAll(@Query('branchId', ParseIntPipe) branchId: number) {
    return this.customersService.findAll(branchId);
  }

  /** รายละเอียดสมาชิก 1 คน */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  /** สมัครสมาชิกด่วน */
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  /** แก้ไขข้อมูลสมาชิก */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }
}
