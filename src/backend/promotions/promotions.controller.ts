import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, ParseIntPipe, Query, Inject, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { validateBody } from '../common/validate-body';
import {
  CreatePromotionDto, UpdatePromotionDto, ValidatePromotionDto, ValidateAtTableDto,
} from './dto/promotion.dto';
import { Public } from '../auth/public.decorator';

@Controller('promotions')
export class PromotionsController {
  constructor(@Inject(PromotionsService) private readonly promotionsService: PromotionsService) {}

  /** โปรโมชั่นที่ใช้ได้ สำหรับหน้าสั่งอาหาร QR — สาขามาจาก QR ของโต๊ะ */
  @Public()
  @Get('at-table')
  findAtTable(@Query('qrCode') qrCode: string) {
    return this.promotionsService.findActiveAtTable(qrCode);
  }

  /** ตรวจเงื่อนไขโปรโมชั่นจากหน้า QR */
  @Public()
  @Post('validate-at-table')
  @HttpCode(HttpStatus.OK) // a price check, not a creation
  validateAtTable(@Body(validateBody(ValidateAtTableDto)) dto: ValidateAtTableDto) {
    return this.promotionsService.validateAtTable(
      dto.qrCode, dto.promotionId, dto.totalAmount, dto.customerId,
    );
  }

  /** รายการโปรโมชั่นทั้งหมด (admin ใช้) */
  @Get()
  findAll(
    @Request() req,
    @Query('branchId', ParseIntPipe) branchId: number,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.promotionsService.findAll(req.user.userId, branchId, activeOnly === 'true');
  }

  /** ตรวจสอบเงื่อนไขโปรโมชั่น — cashier เรียกก่อนยืนยันชำระ */
  @Post('validate')
  validate(@Request() req, @Body(validateBody(ValidatePromotionDto)) dto: ValidatePromotionDto) {
    return this.promotionsService.validate(req.user.userId, dto);
  }

  /** สร้างโปรโมชั่นใหม่ */
  @Post()
  create(@Request() req, @Body(validateBody(CreatePromotionDto)) dto: CreatePromotionDto) {
    return this.promotionsService.create(req.user.userId, dto);
  }

  /** แก้ไขโปรโมชั่น */
  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body(validateBody(UpdatePromotionDto)) dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(req.user.userId, id, dto);
  }

  /** เปิด/ปิดโปรโมชั่น */
  @Patch(':id/toggle')
  toggle(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.toggle(req.user.userId, id);
  }

  /** ลบโปรโมชั่น */
  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(req.user.userId, id);
  }
}
