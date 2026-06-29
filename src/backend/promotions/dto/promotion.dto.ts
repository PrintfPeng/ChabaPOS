import {
  IsString, IsNumber, IsBoolean, IsOptional,
  IsEnum, Min, IsDateString,
} from 'class-validator';

export enum PromotionType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
  POINTS_REDEMPTION = 'POINTS_REDEMPTION',
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
}
