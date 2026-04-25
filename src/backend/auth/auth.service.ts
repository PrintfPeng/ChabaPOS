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
    if (!this.prisma.isConfigured()) {
      throw new UnauthorizedException('ระบบฐานข้อมูลยังไม่ได้ถูกตั้งค่า กรุณาตรวจสอบที่เมนู Settings');
    }

    const trimmedEmail = email?.trim();
    this.logger.log(`[AuthService] Validating user: ${trimmedEmail}`);
    
    if (!trimmedEmail) {
      this.logger.warn(`[AuthService] Missing email`);
      return null;
    }

    const user = await this.prisma.user.findUnique({ 
      where: { email: trimmedEmail } 
    });

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
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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
      throw new UnauthorizedException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.prisma.user.create({
        data: {
          email: trimmedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
        },
      });
      this.logger.log(`[AuthService] User created successfully: ${trimmedEmail}`);
      return this.login(user);
    } catch (error) {
      this.logger.error(`[AuthService] Registration error:`, error);
      throw error;
    }
  }
}
