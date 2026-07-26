import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto, CreateMenuItemDto, CreateDeliveryPlatformDto } from './menu.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
export class UpdateDeliveryPlatformDto extends PartialType(CreateDeliveryPlatformDto) {}

