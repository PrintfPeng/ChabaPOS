import { IsString, IsInt, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
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
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export class ReceivePurchaseOrderItemDto {
  @IsInt()
  rawMaterialId: number;

  @IsNumber()
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
