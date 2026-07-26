import { IsString, IsInt, IsOptional, IsNumber, IsUrl, IsNotEmpty, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsInt()
  branchId: number;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateDeliveryPlatformDto {
  @IsString()
  name: string;

  @IsInt()
  branchId: number;
}

export class MenuItemDeliveryPriceDto {
  @IsInt()
  platformId: number;

  @IsNumber()
  price: number;
}

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  // Plain string, not @IsUrl(): the UI legitimately sends '' to clear an image.
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNotEmpty({ message: 'กรุณาระบุหมวดหมู่' })
  @IsInt()
  categoryId: number;

  @IsInt()
  branchId: number;

  @IsNotEmpty({ message: 'กรุณาระบุห้องครัว' })
  @IsInt()
  kitchenId: number;

  @IsOptional()
  @IsInt({ each: true })
  optionGroupIds?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDeliveryPriceDto)
  deliveryPrices?: MenuItemDeliveryPriceDto[];

  @IsOptional()
  @IsBoolean()
  isDeliveryAvailable?: boolean;
}

export class BulkDeliveryStatusDto {
  @IsInt()
  branchId: number;

  @IsArray()
  @IsInt({ each: true })
  enabledIds: number[];
}

