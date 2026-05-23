import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsInt()
  branchId: number;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  contact?: string;
}
