import {
  Controller, Get, Post, Delete, Body, Param, Patch,
  Query, ParseIntPipe, Inject, Logger, Request, UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAtTableDto } from './dto/create-order-at-table.dto';
import { Public } from '../auth/public.decorator';
import { ThrottleGuard } from '../auth/throttle.guard';
import { validateBody } from '../common/validate-body';

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

  /** QR self-order — no login required, but needs a valid QR code */
  /** FIX H4: ThrottleGuard limits spam orders per IP */
  @Public()
  @UseGuards(ThrottleGuard)
  @Post('at-table')
  createAtTable(@Body(validateBody(CreateOrderAtTableDto)) dto: CreateOrderAtTableDto) {
    return this.ordersService.createAtTable(dto);
  }

  /** Staff / delivery order — must be logged in and own the branch */
  @Post()
  create(@Request() req, @Body(validateBody(CreateOrderDto)) dto: CreateOrderDto) {
    return this.ordersService.createAsStaff(req.user.userId, dto);
  }

  /** FIX M7: Accepts optional page/limit for pagination */
  @Get()
  findAll(
    @Query('branchId', ParseIntPipe) branchId: number,
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAllByBranch(
      branchId,
      page  ? parseInt(page,  10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** FIX C2: passes userId so the service can verify kitchen ownership */
  @Get('kitchen/:id')
  findByKitchen(
    @Request() req,
    @Param('id', ParseIntPipe) kitchenId: number,
  ) {
    return this.ordersService.findByKitchen(req.user.userId, kitchenId);
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

  /** FIX C1: passes userId so the service can assert branch ownership */
  @Post('table/:tableId/pay')
  completePayment(
    @Request() req,
    @Param('tableId', ParseIntPipe) tableId: number,
    @Body('paymentType')   paymentType:    'CASH' | 'TRANSFER',
    @Body('customerId')    customerId?:    number,
    @Body('promotionId')   promotionId?:   number,
    @Body('discountAmount') discountAmount?: number,
  ) {
    return this.ordersService.completePayment(req.user.userId, tableId, paymentType, {
      customerId:     customerId     ? Number(customerId)     : undefined,
      promotionId:    promotionId    ? Number(promotionId)    : undefined,
      discountAmount: discountAmount ? Number(discountAmount) : undefined,
    });
  }

  /** FIX C2: passes userId so the service can verify ownership before status change */
  @Patch('items/:id/status')
  updateItemStatus(
    @Request() req,
    @Param('id', ParseIntPipe) itemId: number,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateItemStatus(req.user.userId, itemId, status);
  }

  /** FIX M3: cancel an order and release the table when no orders remain */
  @Delete(':id')
  cancelOrder(
    @Request() req,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.cancelOrder(req.user.userId, orderId);
  }
}
