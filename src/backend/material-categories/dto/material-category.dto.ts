import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateMaterialCategoryDto {
  @IsString()
  name: string;

  @IsInt()
  branchId: number;
}

export class UpdateMaterialCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;
}
