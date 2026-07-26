import {
  Controller, Get, Patch, Put, Param, Body, ParseIntPipe, Inject, UseGuards,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SettingsService } from '../settings/settings.service';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { UpdateSettingsDto } from '../settings/dto/update-settings.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { validateBody } from '../common/validate-body';

@Controller('super-admin')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(
    @Inject(SuperAdminService) private readonly superAdminService: SuperAdminService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboardStats() {
    return this.superAdminService.getDashboardStats();
  }

  // ── Tenant management ────────────────────────────────────────────────────────

  @Get('tenants')
  findAllTenants() {
    return this.superAdminService.findAllTenants();
  }

  @Patch('tenants/:id/plan')
  updateTenantPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body(validateBody(UpdateTenantPlanDto)) dto: UpdateTenantPlanDto,
  ) {
    return this.superAdminService.updateTenantPlan(id, dto);
  }

  @Patch('tenants/:id/status')
  updateTenantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(validateBody(UpdateTenantStatusDto)) dto: UpdateTenantStatusDto,
  ) {
    return this.superAdminService.updateTenantStatus(id, dto);
  }

  // ── Platform settings ─────────────────────────────────────────────────────────

  @Put('settings')
  updateSettings(@Body(validateBody(UpdateSettingsDto)) dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }

  // ── Billing / payment transactions ────────────────────────────────────────────

  @Get('billing/transactions')
  getBillingTransactions() {
    return this.superAdminService.getBillingTransactions();
  }

  @Patch('billing/:id/approve')
  approveTransaction(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.approveTransaction(id);
  }

  @Patch('billing/:id/reject')
  rejectTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body('note') note?: string,
  ) {
    return this.superAdminService.rejectTransaction(id, note);
  }
}
