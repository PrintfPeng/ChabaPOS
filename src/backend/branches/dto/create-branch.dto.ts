import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  name: string;

  // Plain string, not @IsUrl(): the UI legitimately sends '' to clear an image.
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsInt()
  brandId: number;

  @IsOptional()
  @IsString()
  pin?: string;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string;
}
