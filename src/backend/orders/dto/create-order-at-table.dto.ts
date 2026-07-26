import { IsString, IsArray, ValidateNested, IsOptional, IsInt, MinLength, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

class AtTableOptionDto {
  @IsInt()
  optionId: number;
}

class AtTableItemDto {
  @IsInt()
  menuItemId: number;

  @IsInt()
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
 * Deliberately omits branchId, tableId, customerId and discountAmount: each of
 * those decides who gets billed, who earns points, or how much is taken off, so
 * the server derives them instead of accepting them.
 */
export class CreateOrderAtTableDto {
  @IsString()
  @MinLength(1)
  qrCode: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AtTableItemDto)
  items: AtTableItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  /** Resolved to a member of this branch, or ignored if it matches nobody. */
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
