import { IsString, IsInt, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @IsInt()
  rawMaterialId: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

export class CreatePurchaseOrderDto {
  @IsInt()
  supplierId: number;

  @IsInt()
  branchId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderStatusDto {
  @IsString()
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}
