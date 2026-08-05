import {
  Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus,
} from '@nestjs/common';

interface BucketEntry {
  count:     number;
  windowEnd: number;
}

/**
 * FIX H4: Simple in-memory rate limiter for @Public() routes.
 * Default: 30 requests per 60-second sliding window per IP.
 * Apply with @UseGuards(ThrottleGuard) on public endpoints.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly buckets = new Map<string, BucketEntry>();
  private readonly limit    = 30;
  private readonly windowMs = 60_000;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ ip?: string; headers: Record<string, string> }>();
    const ip  =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.ip
      ?? 'unknown';

    const now    = Date.now();
    const bucket = this.buckets.get(ip);

    if (!bucket || now > bucket.windowEnd) {
      this.buckets.set(ip, { count: 1, windowEnd: now + this.windowMs });
      this.cleanup(now);
      return true;
    }

    bucket.count += 1;
    if (bucket.count > this.limit) {
      throw new HttpException('คำขอมากเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private cleanup(now: number) {
    if (this.buckets.size > 5_000) {
      for (const [key, entry] of this.buckets) {
        if (now > entry.windowEnd) this.buckets.delete(key);
      }
    }
  }
}