import { IsString, IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateRawMaterialDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsInt()
  categoryId: number;

  @IsInt()
  branchId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}

export class UpdateStockDto {
  @IsNumber()
  @Min(0)
  stock: number;
}
