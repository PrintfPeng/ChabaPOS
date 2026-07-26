import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Matches } from 'class-validator';

export class CheckoutDto {
  @IsInt({ message: 'planId ไม่ถูกต้อง' })
  @IsPositive({ message: 'planId ไม่ถูกต้อง' })
  planId: number;

  @IsString()
  @MaxLength(1000)
  @Matches(/^https?:\/\/.+/i, { message: 'slipUrl ต้องเป็น URL ที่ถูกต้อง' })
  slipUrl: string;

  /**
   * Optional — only used to disambiguate when the signed-in user owns more than
   * one brand. The server always re-checks that the caller owns it, so this can
   * never be used to bill someone else's tenant.
   */
  @IsOptional()
  @IsInt()
  @IsPositive()
  brandId?: number;
}
