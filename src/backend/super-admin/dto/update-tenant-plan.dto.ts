import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTenantPlanDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  planId: number | null;
}
