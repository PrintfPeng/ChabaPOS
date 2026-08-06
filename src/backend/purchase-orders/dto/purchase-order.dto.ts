import { IsString, IsIn, IsInt, IsOptional, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @IsInt()
  rawMaterialId: number;

  @IsNumber()
  quantity: number;

  /** Price per unit — optional, defaults to 0 when price field is hidden on the form */
  @IsOptional()
  @IsNumber()
  price?: number;
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
  @IsIn(['PENDING', 'COMPLETED', 'CANCELLED'])
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export class ReceivePurchaseOrderItemDto {
  @IsInt()
  rawMaterialId: number;

  @IsNumber()
  @Min(0)
  actualQuantity: number;

  @IsNumber()
  pricePerUnit: number;
}

export class ReceivePurchaseOrderDto {
  @IsNumber()
  totalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items: ReceivePurchaseOrderItemDto[];
}
