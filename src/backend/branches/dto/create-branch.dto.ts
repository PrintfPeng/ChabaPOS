import { IsString, IsOptional, IsUrl, IsInt } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsInt()
  brandId: number;
}
