import {
  IsString, IsArray, ValidateNested, IsOptional, IsInt,
  MinLength, MaxLength, Matches, Min, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class AtTableOptionDto {
  @IsInt()
  optionId: number;
}

class AtTableItemDto {
  @IsInt()
  menuItemId: number;

  /** FIX H1: quantity must be at least 1 */
  @IsInt()
  @Min(1)
  quantity: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AtTableOptionDto)
  @IsOptional()
  options?: AtTableOptionDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * Order placed from the QR page.
 *
 * branchId, tableId, customerId and discountAmount are intentionally
 * absent — the server derives them to prevent client-side tampering.
 */
export class CreateOrderAtTableDto {
  @IsString()
  @MinLength(1)
  qrCode: string;

  /** FIX E2: order must have at least one item */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AtTableItemDto)
  items: AtTableItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  @MinLength(9)
  @MaxLength(10)
  @Matches(/^[0-9]+$/, { message: 'phone must contain digits only' })
  customerPhone?: string;

  @IsInt()
  @IsOptional()
  promotionId?: number;
}
