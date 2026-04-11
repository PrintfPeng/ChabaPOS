import { IsString, IsInt, IsOptional, IsNumber, IsUrl } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsInt()
  branchId: number;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsInt()
  categoryId: number;

  @IsInt()
  branchId: number;

  @IsOptional()
  @IsInt()
  kitchenId?: number;

  @IsOptional()
  @IsInt({ each: true })
  optionGroupIds?: number[];
}
