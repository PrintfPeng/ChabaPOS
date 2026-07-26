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
}

/**
 * Member lookup from the QR ordering page. The caller proves it is at a table by
 * sending that table's QR code; the branch is derived from it, never supplied.
 */
export class LookupAtTableDto {
  @IsString()
  @MinLength(1)
  qrCode: string;

  @IsString()
  @MinLength(9)
  @MaxLength(10)
  @Matches(/^[0-9]+$/, { message: 'phone must contain digits only' })
  phone: string;
}
