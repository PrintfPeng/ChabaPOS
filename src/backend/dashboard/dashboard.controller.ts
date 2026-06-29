import { Controller, Get, Query, Inject } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Query('branchId') branchId: string) {
    return this.dashboardService.getSummary(Number(branchId));
  }

  @Get('revenue')
  async getRevenue(
    @Query('branchId') branchId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly',
  ) {
    return this.dashboardService.getRevenue(Number(branchId), period);
  }

  @Get('logs')
  async getLogs(@Query('branchId') branchId: string) {
    return this.dashboardService.getLogs(Number(branchId));
  }

  @Get('reports/sales')
  async getSalesReport(
    @Query('branchId') branchId: string,
    @Query('filter') filter: 'today' | 'week' | 'month' | '6months' | 'year',
  ) {
    return this.dashboardService.getSalesReport(Number(branchId), filter);
  }
}
