import { IsString, IsInt, IsNumber, IsOptional } from 'class-validator';

export class CreateOptionGroupDto {
  @IsString()
  name: string;

  @IsInt()
  branchId: number;
}

export class CreateOptionDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsInt()
  optionGroupId: number;
}
