import { Body, Controller, Inject, Post, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';
import { validateBody } from '../common/validate-body';

@Controller('billing')
export class BillingController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  /**
   * POST /api/billing/checkout
   * Auth required (global JwtAuthGuard) — the tenant is derived from the token,
   * never from the request body.
   */
  @Post('checkout')
  checkout(@Request() req, @Body(validateBody(CheckoutDto)) dto: CheckoutDto) {
    return this.billingService.checkout(req.user.userId, dto);
  }
}
