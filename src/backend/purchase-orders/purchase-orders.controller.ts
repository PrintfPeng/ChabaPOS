import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Request, Query, Inject } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderStatusDto } from './dto/purchase-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(@Inject(PurchaseOrdersService) private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  create(@Request() req, @Body() createPurchaseOrderDto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(req.user.userId, createPurchaseOrderDto);
  }

  @Get()
  findAll(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.purchaseOrdersService.findAll(req.user.userId, branchId);
  }

  @Get('today')
  getTodayOrders(@Request() req, @Query('branchId', ParseIntPipe) branchId: number) {
    return this.purchaseOrdersService.getTodayOrders(req.user.userId, branchId);
  }

  @Patch(':id/status')
  updateStatus(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updatePurchaseOrderStatusDto: UpdatePurchaseOrderStatusDto) {
    return this.purchaseOrdersService.updateStatus(req.user.userId, id, updatePurchaseOrderStatusDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrdersService.remove(req.user.userId, id);
  }
}
