import { PartialType } from '@nestjs/mapped-types';
import { CreateOptionGroupDto, CreateOptionDto } from './option.dto';
import { IsOptional, IsInt } from 'class-validator';

export class UpdateOptionGroupDto extends PartialType(CreateOptionGroupDto) {
  @IsOptional()
  @IsInt({ each: true })
  menuItemIds?: number[];
}

export class UpdateOptionDto extends PartialType(CreateOptionDto) {}
