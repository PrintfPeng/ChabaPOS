import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * FIX H3: Guards any route that requires an active brand subscription.
 * Apply with @UseGuards(BrandStatusGuard) on controllers or individual routes.
 *
 * Expects req.user.userId from the JWT guard which runs first.
 * Blocks suspended brands and brands whose plan has expired.
 *
 * A2-3: Checks ALL of the user's brands (findMany) — not just the first one
 * returned by findFirst. Rules:
 *   - If ANY brand is SUSPENDED → block (admin action that covers the whole account)
 *   - If ALL brands have an expired plan → block (user must renew at least one)
 */
@Injectable()
export class BrandStatusGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: number | undefined = request.user?.userId;
    if (!userId) return true;

    const brands = await this.prisma.brand.findMany({
      where:  { userId },
      select: { status: true, planExpiresAt: true },
    });

    if (brands.length === 0) return true;

    if (brands.some(b => b.status === 'SUSPENDED')) {
      throw new ForbiddenException('บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ');
    }

    const now = new Date();
    const hasActivePlan = brands.some(b => !b.planExpiresAt || b.planExpiresAt >= now);
    if (!hasActivePlan) {
      throw new ForbiddenException('แพ็กเกจของคุณหมดอายุแล้ว กรุณาต่ออายุการใช้งาน');
    }

    return true;
  }
}
