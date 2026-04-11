import { IsString, IsInt } from 'class-validator';

export class CreateKitchenDto {
  @IsString()
  name: string;

  @IsInt()
  branchId: number;
}
