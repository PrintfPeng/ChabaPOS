import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
