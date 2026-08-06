import {
  Injectable, UnauthorizedException, ConflictException,
  Inject, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {
    this.logger.log('AuthService initialized');
  }

  async validateUser(email: string, pass: string): Promise<any> {
    if (!this.prisma.isConfigured()) {
      throw new UnauthorizedException('ระบบฐานข้อมูลยังไม่ได้ถูกตั้งค่า กรุณาตรวจสอบที่เมนู Settings');
    }

    const trimmedEmail = email?.trim();
    this.logger.log(`[AuthService] Validating user: ${trimmedEmail}`);

    if (!trimmedEmail) {
      this.logger.warn(`[AuthService] Missing email`);
      return null;
    }

    const user = await this.prisma.user.findUnique({ where: { email: trimmedEmail } });

    if (!user) {
      this.logger.warn(`[AuthService] User not found in DB: ${trimmedEmail}`);
      return null;
    }

    try {
      this.logger.log(`[AuthService] Comparing password for: ${trimmedEmail}`);
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        this.logger.log(`[AuthService] Password match confirmed for: ${trimmedEmail}`);
        const { password, ...result } = user;
        return result;
      }
      this.logger.warn(`[AuthService] Password mismatch for user: ${trimmedEmail}`);
    } catch (error) {
      this.logger.error(`[AuthService] Exception during password comparison for ${trimmedEmail}:`, error);
    }

    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async register(dto: any) {
    if (!this.prisma.isConfigured()) {
      throw new UnauthorizedException('ระบบฐานข้อมูลยังไม่ได้ถูกตั้งค่า กรุณาตรวจสอบที่เมนู Settings');
    }

    const { email, password, firstName, lastName, phone } = dto;
    const trimmedEmail = email?.trim();

    this.logger.log(`[AuthService] Registering user: ${trimmedEmail}`);

    const existingEmail = await this.prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingEmail) {
      this.logger.warn(`[AuthService] Email already exists: ${trimmedEmail}`);
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.prisma.user.create({
        data: { email: trimmedEmail, password: hashedPassword, firstName, lastName, phone },
      });
      this.logger.log(`[AuthService] User created successfully: ${trimmedEmail}`);
      return this.login(user);
    } catch (error) {
      this.logger.error(`[AuthService] Registration error:`, error);
      throw error;
    }
  }

  /**
   * Freemium onboarding:
   * - Brand is created as ACTIVE with the Free plan so the user can log in immediately.
   * - A PaymentTransaction (PENDING) is created only when the user selected a paid plan
   *   and uploaded a slip — the admin then approves it to upgrade the brand's plan.
   * - Returns a JWT so the frontend can auto-login without a separate round-trip.
   */
  async registerTenant(dto: RegisterTenantDto) {
    if (!this.prisma.isConfigured()) {
      throw new UnauthorizedException('ระบบฐานข้อมูลยังไม่ได้ถูกตั้งค่า');
    }

    const trimmedEmail = dto.email?.trim();
    this.logger.log(`[AuthService] Tenant registration: ${trimmedEmail}`);

    const existing = await this.prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const freePlan = await this.prisma.subscriptionPlan.findFirst({ where: { name: 'Free' } });
    if (!freePlan) {
      this.logger.warn('[AuthService] Free plan not found — brand created without a default plan');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const createdUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: trimmedEmail,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      });

      const brand = await tx.brand.create({
        data: {
          name: dto.shopName,
          userId: user.id,
          status: 'ACTIVE',
          planId: freePlan?.id ?? null,
        },
      });

      // Only queue a payment transaction when the user wants to upgrade to a paid plan
      const isPremiumUpgrade = freePlan ? dto.planId !== freePlan.id : true;
      if (isPremiumUpgrade && dto.slipUrl) {
        await tx.paymentTransaction.create({
          data: {
            brandId: brand.id,
            planId: dto.planId,
            slipUrl: dto.slipUrl,
            status: 'PENDING',
          },
        });
      }

      return user;
    });

    this.logger.log(`[AuthService] Tenant registered successfully: ${trimmedEmail}`);
    return this.login(createdUser);
  }
}
