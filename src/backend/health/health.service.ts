import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogLevel } from '@prisma/client';

export interface LogFilter {
  level?:   LogLevel;
  source?:  string;
  module?:  string;
  from?:    string;
  to?:      string;
  page?:    number;
  limit?:   number;
}

@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getStatus() {
    const dbOk = await this.prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    const mem    = process.memoryUsage();
    const uptime = process.uptime();

    const [errCount24h, warnCount24h, critCount24h] = await Promise.all([
      this.prisma.systemLog.count({
        where: { level: 'ERROR',    createdAt: { gte: this.hoursAgo(24) } },
      }),
      this.prisma.systemLog.count({
        where: { level: 'WARN',     createdAt: { gte: this.hoursAgo(24) } },
      }),
      this.prisma.systemLog.count({
        where: { level: 'CRITICAL', createdAt: { gte: this.hoursAgo(24) } },
      }),
    ]);

    return {
      status: dbOk ? 'healthy' : 'degraded',
      database: dbOk ? 'connected' : 'unreachable',
      uptime: Math.floor(uptime),
      memory: {
        heapUsed:  Math.round(mem.heapUsed  / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss:       Math.round(mem.rss       / 1024 / 1024),
      },
      last24h: { errors: errCount24h, warnings: warnCount24h, critical: critCount24h },
    };
  }

  async getLogs(filter: LogFilter) {
    const page  = Math.max(1, filter.page  ?? 1);
    const limit = Math.min(100, filter.limit ?? 50);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (filter.level)  where.level  = filter.level;
    if (filter.source) where.source = filter.source;
    if (filter.module) where.module = { contains: filter.module, mode: 'insensitive' };
    if (filter.from || filter.to) {
      where.createdAt = {};
      if (filter.from) where.createdAt.gte = new Date(filter.from);
      if (filter.to)   where.createdAt.lte = new Date(filter.to);
    }

    const [total, logs] = await Promise.all([
      this.prisma.systemLog.count({ where }),
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id:         true,
          level:      true,
          source:     true,
          module:     true,
          message:    true,
          stackTrace: true,
          tenantId:   true,
          createdAt:  true,
        },
      }),
    ]);

    return { total, page, limit, logs };
  }

  async createLog(data: {
    level:      LogLevel;
    source:     string;
    module:     string;
    message:    string;
    stackTrace?: string;
    tenantId?:  string;
  }) {
    return this.prisma.systemLog.create({
      data: {
        level:      data.level,
        source:     data.source,
        module:     data.module,
        message:    data.message.slice(0, 2000),
        stackTrace: data.stackTrace ?? null,
        tenantId:   data.tenantId  ?? null,
      },
    });
  }

  private hoursAgo(h: number): Date {
    return new Date(Date.now() - h * 60 * 60 * 1000);
  }
}
