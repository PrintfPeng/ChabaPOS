import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateRawMaterialDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsInt()
  categoryId: number;

  @IsInt()
  branchId: number;
}

export class UpdateRawMaterialDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;
}
