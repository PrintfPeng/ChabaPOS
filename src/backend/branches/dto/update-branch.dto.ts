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

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  bankType?: string;

  @IsOptional()
  @IsString()
  bankAccountNo?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;
}
