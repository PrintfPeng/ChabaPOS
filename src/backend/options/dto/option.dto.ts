import { IsString, IsInt, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateOptionGroupDto {
  @IsString()
  name: string;

  @IsInt()
  branchId: number;

  @IsOptional()
  @IsBoolean()
  isMultiple?: boolean;
}

export class CreateOptionDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsInt()
  optionGroupId: number;
}
