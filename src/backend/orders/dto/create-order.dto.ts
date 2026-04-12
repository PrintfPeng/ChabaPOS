import { IsNumber, IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

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
}

export class CreateOrderDto {
  @IsNumber()
  branchId: number;

  @IsNumber()
  @IsOptional()
  tableId?: number;

  @IsString()
  @IsOptional()
  source?: 'CUSTOMER' | 'STAFF';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
