import { Controller, Get, Query, Inject, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @Request() req,
    @Query('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('orderType') orderType?: string,
  ) {
    return this.dashboardService.getSummary(req.user.userId, Number(branchId), startDate, endDate, orderType);
  }

  @Get('revenue')
  async getRevenue(
    @Request() req,
    @Query('branchId') branchId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('orderType') orderType?: string,
  ) {
    return this.dashboardService.getRevenue(req.user.userId, Number(branchId), period, startDate, endDate, orderType);
  }

  @Get('logs')
  async getLogs(@Request() req, @Query('branchId') branchId: string) {
    return this.dashboardService.getLogs(req.user.userId, Number(branchId));
  }

  @Get('reports/sales')
  async getSalesReport(
    @Request() req,
    @Query('branchId') branchId: string,
    @Query('filter') filter: 'today' | 'week' | 'month' | '6months' | 'year',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('orderType') orderType?: string,
  ) {
    return this.dashboardService.getSalesReport(req.user.userId, Number(branchId), filter, startDate, endDate, orderType);
  }
}
