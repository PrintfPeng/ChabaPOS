import { IsString, IsOptional } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name: string;

  // Plain string, not @IsUrl(): the UI legitimately sends '' to clear an image.
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
