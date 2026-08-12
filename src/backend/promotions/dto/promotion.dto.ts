import {
  IsString, IsNumber, IsBoolean, IsOptional,
  IsEnum, Min, IsDateString, IsArray, IsInt, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PromotionType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
  POINTS_REDEMPTION = 'POINTS_REDEMPTION',
}

export enum PromotionTarget {
  ENTIRE_ORDER = 'ENTIRE_ORDER',
  SPECIFIC_ITEMS = 'SPECIFIC_ITEMS',
}

/** One order line for pricing a SPECIFIC_ITEMS promotion (server recomputes the base). */
export class PromoLineItemDto {
  @IsInt()
  menuItemId: number;

  @IsNumber()
  @Min(0)
  lineTotal: number;
}

export class CreatePromotionDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsEnum(PromotionTarget)
  @IsOptional()
  targetType?: PromotionTarget;

  /** Menu item ids the discount applies to — required when targetType = SPECIFIC_ITEMS */
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  menuIds?: number[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  minSpend?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pointsNeeded?: number;

  @IsBoolean()
  @IsOptional()
  memberOnly?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  branchId: number;
}

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(PromotionType)
  @IsOptional()
  type?: PromotionType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @IsEnum(PromotionTarget)
  @IsOptional()
  targetType?: PromotionTarget;

  /** When provided, replaces the promotion's applicable menu items entirely */
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  menuIds?: number[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  minSpend?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pointsNeeded?: number;

  @IsBoolean()
  @IsOptional()
  memberOnly?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

/** DTO ส่งมาจาก cashier เพื่อตรวจสอบก่อนใช้โปรโมชั่น */
export class ValidatePromotionDto {
  @IsNumber()
  promotionId: number;

  @IsNumber()
  branchId: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @IsOptional()
  customerId?: number;

  /** Cart line items — needed to price a SPECIFIC_ITEMS promotion correctly */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromoLineItemDto)
  @IsOptional()
  items?: PromoLineItemDto[];
}

/**
 * Same check from the QR ordering page. There is no branchId — it is derived
 * from the scanned table, so a customer cannot aim a promotion at another shop.
 */
export class ValidateAtTableDto {
  @IsString()
  qrCode: string;

  @IsNumber()
  promotionId: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @IsOptional()
  customerId?: number;

  /** Cart line items — needed to price a SPECIFIC_ITEMS promotion correctly */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromoLineItemDto)
  @IsOptional()
  items?: PromoLineItemDto[];
}
