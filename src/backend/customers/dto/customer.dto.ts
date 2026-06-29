import {
  IsString, IsNumber, IsOptional, MinLength, MaxLength, Matches,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(9)
  @MaxLength(10)
  @Matches(/^[0-9]+$/, { message: 'phone must contain digits only' })
  phone: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsNumber()
  branchId: number;
}

export class UpdateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  points?: number;
}
