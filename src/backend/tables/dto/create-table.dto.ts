import { IsString, IsInt } from 'class-validator';

export class CreateTableDto {
  @IsString()
  name: string;

  @IsInt()
  zoneId: number;
}
