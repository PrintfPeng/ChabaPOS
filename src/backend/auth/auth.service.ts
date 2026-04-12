import { Injectable, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
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
    console.log(`[AuthService] Validating user: ${email}`);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`[AuthService] User not found: ${email}`);
      return null;
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      console.log(`[AuthService] Password match for: ${email}`);
      const { password, ...result } = user;
      return result;
    }
    console.warn(`[AuthService] Password mismatch for: ${email}`);
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async register(email: string, pass: string) {
    console.log(`[AuthService] Registering user: ${email}`);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.warn(`[AuthService] Registration failed: Email ${email} already exists`);
      throw new UnauthorizedException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    try {
      const hashedPassword = await bcrypt.hash(pass, 10);
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
        },
      });
      console.log(`[AuthService] User created successfully: ${email}`);
      return this.login(user);
    } catch (error) {
      console.error(`[AuthService] Registration error:`, error);
      throw error;
    }
  }
}
