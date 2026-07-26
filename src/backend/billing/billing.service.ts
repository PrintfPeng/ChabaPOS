import {
  Injectable, Inject, Logger,
  BadRequestException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Resolves which brand (tenant) a checkout belongs to using ONLY the
   * authenticated user id from the JWT.
   *
   * A brandId sent by the client is never trusted as an identity — it is used
   * purely to pick between brands the caller is already proven to own, so it
   * cannot be pointed at another tenant (IDOR).
   */
  private async resolveOwnedBrand(userId: number, requestedBrandId?: number) {
    const brands = await this.prisma.brand.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });

    if (brands.length === 0) {
      throw new ForbiddenException('บัญชีนี้ยังไม่มีร้านค้าในระบบ');
    }

    if (requestedBrandId !== undefined) {
      const owned = brands.find(b => b.id === requestedBrandId);
      if (!owned) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงร้านค้านี้');
      return owned;
    }

    if (brands.length > 1) {
      throw new BadRequestException('บัญชีนี้มีหลายร้านค้า กรุณาเลือกร้านค้าที่ต้องการอัปเกรด');
    }

    return brands[0];
  }

  async checkout(userId: number, dto: CheckoutDto) {
    const brand = await this.resolveOwnedBrand(userId, dto.brandId);

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
      select: { id: true, name: true, price: true, isActive: true },
    });
    if (!plan) throw new NotFoundException('ไม่พบแพ็กเกจนี้');
    if (!plan.isActive) throw new BadRequestException('แพ็กเกจนี้ไม่เปิดให้สมัครแล้ว');

    // One open request at a time — stops double-submits creating duplicate bills
    // for the admin to reconcile.
    const pending = await this.prisma.paymentTransaction.findFirst({
      where: { brandId: brand.id, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      throw new BadRequestException(
        'คุณมีรายการที่รอตรวจสอบอยู่แล้ว กรุณารอผลการอนุมัติก่อนส่งรายการใหม่',
      );
    }

    const txn = await this.prisma.paymentTransaction.create({
      data: {
        brandId: brand.id,
        planId: plan.id,
        amount: plan.price, // snapshot, so later price edits don't rewrite history
        slipUrl: dto.slipUrl,
        status: 'PENDING',
      },
      select: { id: true, createdAt: true },
    });

    this.logger.log(
      `[Billing] Checkout #${txn.id} — brand="${brand.name}" plan="${plan.name}" amount=${plan.price}`,
    );

    this.notifyAdmin({
      brandName: brand.name,
      planName: plan.name,
      amount: plan.price,
      transactionId: txn.id,
    });

    return {
      id: txn.id,
      status: 'PENDING' as const,
      createdAt: txn.createdAt,
      message: 'ส่งข้อมูลสำเร็จ กรุณารอแอดมินตรวจสอบภายใน 24 ชั่วโมง',
    };
  }

  /**
   * Fire-and-forget ping so the admin team knows a bill is waiting.
   *
   * Deliberately generic: set ADMIN_WEBHOOK_URL to a Slack/Discord/LINE
   * Messaging API endpoint. (LINE Notify is not used — the service was
   * discontinued on 2025-03-31.)
   *
   * Never awaited and never throws — a broken webhook must not fail a payment
   * the customer has already made.
   */
  private notifyAdmin(p: {
    brandName: string; planName: string; amount: number; transactionId: number;
  }) {
    const url = process.env.ADMIN_WEBHOOK_URL;
    if (!url) return;

    const text =
      `💳 มีบิลรออนุมัติ #${p.transactionId}\n` +
      `ร้าน: ${p.brandName}\n` +
      `แพ็กเกจ: ${p.planName}\n` +
      `ยอด: ฿${p.amount.toLocaleString('th-TH')}`;

    // `text` suits Slack, `content` suits Discord — harmless extra key either way.
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text }),
    }).catch(err => {
      this.logger.warn(`[Billing] Admin webhook failed: ${err?.message ?? err}`);
    });
  }
}
