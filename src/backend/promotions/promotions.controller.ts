import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, ParseIntPipe, Query, Inject,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import {
  CreatePromotionDto, UpdatePromotionDto, ValidatePromotionDto,
} from './dto/promotion.dto';

@Controller('promotions')
export class PromotionsController {
  constructor(@Inject(PromotionsService) private readonly promotionsService: PromotionsService) {}

  /** รายการโปรโมชั่นทั้งหมด (admin ใช้) */
  @Get()
  findAll(
    @Query('branchId', ParseIntPipe) branchId: number,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.promotionsService.findAll(branchId, activeOnly === 'true');
  }

  /** ตรวจสอบเงื่อนไขโปรโมชั่น — cashier เรียกก่อนยืนยันชำระ */
  @Post('validate')
  validate(@Body() dto: ValidatePromotionDto) {
    return this.promotionsService.validate(dto);
  }

  /** สร้างโปรโมชั่นใหม่ */
  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  /** แก้ไขโปรโมชั่น */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, dto);
  }

  /** เปิด/ปิดโปรโมชั่น */
  @Patch(':id/toggle')
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.toggle(id);
  }

  /** ลบโปรโมชั่น */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}
