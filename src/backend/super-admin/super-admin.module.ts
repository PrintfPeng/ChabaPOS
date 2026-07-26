import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SettingsModule } from '../settings/settings.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [SettingsModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, RolesGuard, Reflector],
})
export class SuperAdminModule {}
