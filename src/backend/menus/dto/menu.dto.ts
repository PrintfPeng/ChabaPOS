import { IsString, IsInt, IsOptional, IsNumber, IsUrl, IsNotEmpty } from 'class-validator';

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

  @IsNotEmpty({ message: 'กรุณาระบุหมวดหมู่' })
  @IsInt()
  categoryId: number;

  @IsInt()
  branchId: number;

  @IsNotEmpty({ message: 'กรุณาระบุห้องครัว' })
  @IsInt()
  kitchenId: number;

  @IsOptional()
  @IsInt({ each: true })
  optionGroupIds?: number[];
}
