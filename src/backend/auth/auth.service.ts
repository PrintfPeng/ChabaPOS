import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
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
