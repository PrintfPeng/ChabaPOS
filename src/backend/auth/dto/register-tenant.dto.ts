import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterTenantDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อ' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุนามสกุล' })
  lastName: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อร้านค้า' })
  shopName: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  planId: number;

  @IsOptional()
  @IsString()
  slipUrl?: string;
}
