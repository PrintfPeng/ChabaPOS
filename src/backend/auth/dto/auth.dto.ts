import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  @IsNotEmpty({ message: 'กรุณากรอกอีเมล' })
  email: string;

  @IsString({ message: 'ชื่อต้องเป็นข้อความ' })
  @IsNotEmpty({ message: 'กรุณากรอกชื่อ' })
  firstName: string;

  @IsString({ message: 'นามสกุลต้องเป็นข้อความ' })
  @IsNotEmpty({ message: 'กรุณากรอกนามสกุล' })
  lastName: string;

  @IsString({ message: 'เบอร์โทรศัพท์ต้องเป็นข้อความ' })
  @IsOptional()
  phone?: string;

  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  @MinLength(6, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
  password: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  @IsNotEmpty({ message: 'กรุณากรอกอีเมล' })
  email: string;

  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  password: string;
}
