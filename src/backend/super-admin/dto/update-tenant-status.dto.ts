import { IsIn } from 'class-validator';

export class UpdateTenantStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED', 'TRIAL'])
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
}
