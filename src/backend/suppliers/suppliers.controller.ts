import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Request, Query, Inject } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(@Inject(SuppliersService) private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Request() req, @Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(req.user.userId, createSupplierDto);
  }

  @Get()
  findAll(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.suppliersService.findAll(req.user.userId, branchId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(req.user.userId, id, updateSupplierDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.remove(req.user.userId, id);
  }
}
