import { IsString, IsInt } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  name: string;

  @IsInt()
  branchId: number;
}
