import {
  IsNumber, IsString, IsArray, ValidateNested, IsOptional,
  IsBoolean, IsInt, Min, ArrayMinSize, ValidateIf, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderOptionDto {
  @IsNumber()
  optionId: number;
}

class OrderItemDto {
  @IsNumber()
  menuItemId: number;

  /** FIX H1: quantity must be at least 1 */
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderOptionDto)
  @IsOptional()
  options?: OrderOptionDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderDto {
  @IsNumber()
  branchId: number;

  @IsNumber()
  @IsOptional()
  tableId?: number;

  @IsString()
  @IsOptional()
  source?: 'CUSTOMER' | 'STAFF' | 'QR';

  /** FIX E2: order must have at least one item */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsBoolean()
  @IsOptional()
  isPrepaid?: boolean;

  @IsString()
  @IsOptional()
  paymentType?: 'CASH' | 'TRANSFER';

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @IsOptional()
  customerId?: number;

  @IsInt()
  @IsOptional()
  promotionId?: number;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsString()
  @IsOptional()
  orderType?: string;

  /** FIX E4: deliveryPlatform is required when orderType is DELIVERY */
  @ValidateIf(o => o.orderType === 'DELIVERY')
  @IsString()
  @IsNotEmpty()
  deliveryPlatform?: string;

  /** FIX L1: the specific delivery platform record for per-platform pricing */
  @ValidateIf(o => o.orderType === 'DELIVERY')
  @IsInt()
  @IsOptional()
  deliveryPlatformId?: number;

  shiftId?: string;
}
