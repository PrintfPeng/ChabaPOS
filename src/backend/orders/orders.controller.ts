import { Controller, Get, Post, Body, Param, Patch, UseGuards, Query, ParseIntPipe, Inject, Logger, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAtTableDto } from './dto/create-order-at-table.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
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

  /**
   * ออเดอร์จากหน้าสั่งอาหาร QR — ไม่ต้องล็อกอิน แต่ต้องมี QR ของโต๊ะ
   * สาขา/โต๊ะ/สมาชิก/ส่วนลด คำนวณฝั่ง server ทั้งหมด
   */
  @Public()
  @Post('at-table')
  createAtTable(@Body(validateBody(CreateOrderAtTableDto)) dto: CreateOrderAtTableDto) {
    return this.ordersService.createAtTable(dto);
  }

  /** ออเดอร์จากพนักงาน (หน้าร้าน / delivery) — ต้องล็อกอินและเป็นเจ้าของสาขา */
  @Post()
  create(@Request() req, @Body(validateBody(CreateOrderDto)) createOrderDto: CreateOrderDto) {
    return this.ordersService.createAsStaff(req.user.userId, createOrderDto);
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
    @Body('paymentType') paymentType: 'CASH' | 'TRANSFER',
    @Body('customerId')  customerId?: number,
    @Body('promotionId') promotionId?: number,
    @Body('discountAmount') discountAmount?: number,
  ) {
    return this.ordersService.completePayment(tableId, paymentType, {
      customerId:     customerId     ? Number(customerId)     : undefined,
      promotionId:    promotionId    ? Number(promotionId)    : undefined,
      discountAmount: discountAmount ? Number(discountAmount) : undefined,
    });
  }

  @Patch('items/:id/status')
  updateItemStatus(
    @Param('id', ParseIntPipe) itemId: number,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateItemStatus(itemId, status);
  }
}
