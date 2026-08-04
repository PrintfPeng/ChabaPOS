import { IsNumber, IsString, IsArray, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

class OrderOptionDto {
  @IsNumber()
  optionId: number;
}

class OrderItemDto {
  @IsNumber()
  menuItemId: number;

  @IsNumber()
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

  @IsArray()
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

  @IsString()
  @IsOptional()
  deliveryPlatform?: string;
}
