import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchDto } from './create-branch.dto';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @IsNumber()
  @IsOptional()
  @Min(1)
  rewardPointRate?: number;
}
