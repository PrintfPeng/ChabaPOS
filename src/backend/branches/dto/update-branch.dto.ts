import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchDto } from './create-branch.dto';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @IsOptional()
  @IsString()
  qrCodeUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  rewardPointRate?: number;
}
