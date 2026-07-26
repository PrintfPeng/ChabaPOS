import { IsString, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  bankName: string;

  @IsString()
  accountName: string;

  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string;
}
