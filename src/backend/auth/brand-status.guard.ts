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
 */
@Injectable()
export class BrandStatusGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: number | undefined = request.user?.userId;
    if (!userId) return true;

    const brand = await this.prisma.brand.findFirst({
      where:  { userId },
      select: { status: true, planExpiresAt: true },
    });

    if (!brand) return true;

    if (brand.status === 'SUSPENDED') {
      throw new ForbiddenException('บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ');
    }

    if (brand.planExpiresAt && brand.planExpiresAt < new Date()) {
      throw new ForbiddenException('แพ็กเกจของคุณหมดอายุแล้ว กรุณาต่ออายุการใช้งาน');
    }

    return true;
  }
}