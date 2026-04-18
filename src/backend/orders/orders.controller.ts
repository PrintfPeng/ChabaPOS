import { Controller, Get, Post, Body, Param, Patch, UseGuards, Query, ParseIntPipe, Inject, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {
    if (!this.ordersService) {
      this.logger.error('OrdersService failed to inject!');
    } else {
      this.logger.log('OrdersService injected successfully');
    }
  }

  @Public()
  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll(@Query('branchId', ParseIntPipe) branchId: number) {
    return this.ordersService.findAllByBranch(branchId);
  }

  @Get('kitchen/:id')
  findByKitchen(@Param('id', ParseIntPipe) kitchenId: number) {
    return this.ordersService.findByKitchen(kitchenId);
  }

  @Get('branch/:branchId/kitchen-items')
  findByBranchKitchenItems(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.ordersService.findByBranchKitchenItems(branchId);
  }

  @Get('branch/:branchId/unpaid')
  findUnpaidByBranch(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.ordersService.findUnpaidByBranch(branchId);
  }

  @Get('table/:tableId/unpaid')
  findUnpaidByTable(@Param('tableId', ParseIntPipe) tableId: number) {
    return this.ordersService.findUnpaidByTable(tableId);
  }

  @Post('table/:tableId/pay')
  completePayment(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Body('paymentType') paymentType: 'CASH' | 'TRANSFER'
  ) {
    return this.ordersService.completePayment(tableId, paymentType);
  }

  @Patch('items/:id/status')
  updateItemStatus(
    @Param('id', ParseIntPipe) itemId: number,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateItemStatus(itemId, status);
  }
}
