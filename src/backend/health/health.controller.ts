import {
  Controller, Get, Post, Query, Body, UseGuards,
  ParseIntPipe, DefaultValuePipe, Optional,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LogLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { validateBody } from '../common/validate-body';

class CreateLogDto {
  @IsEnum(LogLevel)
  level: LogLevel;

  @IsString()
  source: string;

  @IsString()
  module: string;

  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  stackTrace?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;
}

@Controller('super-admin/health')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getStatus() {
    return this.healthService.getStatus();
  }

  @Get('logs')
  getLogs(
    @Query('level')  level?:  LogLevel,
    @Query('source') source?: string,
    @Query('module') module?: string,
    @Query('from')   from?:   string,
    @Query('to')     to?:     string,
    @Query('page',   new DefaultValuePipe(1),  ParseIntPipe) page  = 1,
    @Query('limit',  new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.healthService.getLogs({ level, source, module, from, to, page, limit });
  }

  @Post('logs')
  createLog(@Body(validateBody(CreateLogDto)) dto: CreateLogDto) {
    return this.healthService.createLog(dto);
  }
}
