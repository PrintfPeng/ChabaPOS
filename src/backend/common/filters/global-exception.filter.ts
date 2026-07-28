import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

/**
 * Catches every unhandled exception across the application.
 *
 * Registered via app.useGlobalFilters() in server.ts (manual instantiation,
 * not DI) — same pattern as the former PrismaClientExceptionFilter.
 * Receives httpAdapterHost and prismaService from app.get() after bootstrap.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx      = host.switchToHttp();
    const request  = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    const { status, message, error } = this.resolveException(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    // Persist errors to SystemLog — fire-and-forget, never blocks the response
    if (status >= 500 || status === 400) {
      const level = status >= 500 ? 'ERROR' : 'WARN';

      const urlModule = (request?.url ?? '')
        .replace(/^\/api\//, '')
        .split('/')[0]
        .split('?')[0];

      const module =
        urlModule && urlModule !== 'api'
          ? urlModule.charAt(0).toUpperCase() + urlModule.slice(1)
          : 'Unknown';

      try {
        this.prisma.systemLog
          .create({
            data: {
              level,
              source:     'BACKEND',
              module,
              message:    message.slice(0, 2000),
              stackTrace: status >= 500 ? (stack ?? null) : null,
              tenantId:   String((request as any)?.user?.userId ?? '') || null,
            },
          })
          .catch((e) => this.logger.error('Failed to write SystemLog entry', e));
      } catch (e) {
        // systemLog may not exist on old Prisma client — never block the response
        this.logger.error('Failed to write SystemLog entry (sync)', e);
      }

      if (status >= 500) {
        this.logger.error(
          `${request?.method ?? '?'} ${request?.url ?? '?'} → ${status}: ${message}`,
          stack,
        );
      }
    }

    httpAdapter.reply(
      response,
      {
        statusCode: status,
        timestamp:  new Date().toISOString(),
        path:       request?.url,
        error,
        message,
      },
      status,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  private resolveException(exception: unknown): {
    status:  number;
    message: string;
    error:   string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res    = exception.getResponse();

      if (typeof res === 'string') {
        return { status, message: res, error: exception.name };
      }

      const resObj  = res as Record<string, any>;
      const message = Array.isArray(resObj.message)
        ? resObj.message.join('; ')
        : String(resObj.message ?? exception.message);

      return { status, message, error: resObj.error ?? exception.name };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return { status: HttpStatus.CONFLICT,    message: 'ข้อมูลนี้มีอยู่ในระบบแล้ว (Unique constraint failed)',                                            error: 'Conflict'               };
        case 'P2003':
          return { status: HttpStatus.BAD_REQUEST, message: 'ไม่สามารถลบหรือแก้ไขข้อมูลได้ เนื่องจากมีการใช้งานอยู่ในส่วนอื่น (Foreign key constraint failed)', error: 'Bad Request'             };
        case 'P2025':
          return { status: HttpStatus.NOT_FOUND,   message: 'ไม่พบข้อมูลที่ต้องการ (Record not found)',                                                          error: 'Not Found'              };
        default:
          return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: exception.message.replace(/\n/g, ' '), error: 'Database Error' };
      }
    }

    if (exception instanceof Error) {
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: exception.message, error: 'Internal Server Error' };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unexpected error occurred', error: 'Internal Server Error' };
  }
}
