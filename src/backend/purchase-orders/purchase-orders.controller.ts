import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Request, Query, Inject } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderStatusDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { validateBody } from '../common/validate-body';

@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(@Inject(PurchaseOrdersService) private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  create(@Request() req, @Body(validateBody(CreatePurchaseOrderDto)) createPurchaseOrderDto: CreatePurchaseOrderDto) {
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

  @Post(':id/receive')
  receive(@Request() req, @Param('id', ParseIntPipe) id: number, @Body(validateBody(ReceivePurchaseOrderDto)) receivePurchaseOrderDto: ReceivePurchaseOrderDto) {
    return this.purchaseOrdersService.receive(req.user.userId, id, receivePurchaseOrderDto);
  }

  @Patch(':id/status')
  updateStatus(@Request() req, @Param('id', ParseIntPipe) id: number, @Body(validateBody(UpdatePurchaseOrderStatusDto)) updatePurchaseOrderStatusDto: UpdatePurchaseOrderStatusDto) {
    return this.purchaseOrdersService.updateStatus(req.user.userId, id, updatePurchaseOrderStatusDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrdersService.remove(req.user.userId, id);
  }
}
