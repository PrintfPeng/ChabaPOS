import { Controller, Post, Body, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    if (!this.authService) {
      this.logger.error('AuthService failed to inject!');
    }
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    this.logger.log(`Login attempt for: ${body.email}`);
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      this.logger.warn(`Login failed for: ${body.email}`);
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    return this.authService.login(user);
  }

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    this.logger.log(`Registration attempt for: ${body.email}`);
    return this.authService.register(body.email, body.password);
  }
}
