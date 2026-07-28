// ESC/POS receipt builder — canvas raster, Thai-safe
// 80mm paper: 203 DPI → printable ≈ 72mm = 576 dots  |  48 chars/line (Font A)

import QRCode from 'qrcode';

const PW   = 576;   // print width in dots (80mm @ 203 DPI)
const COLS = 48;    // reference columns for text-mode helpers
const M    = 12;    // left / right page margin in dots

// ── Text-mode helpers ─────────────────────────────────────────────────────────
export function formatLine(left: string, right: string, width = COLS): string {
  const available = width - right.length;
  const l = left.length >= available ? left.slice(0, available - 1) + '…' : left;
  return l.padEnd(available) + right;
}
export function centerLine(text: string, width = COLS): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}
export function dividerLine(char = '-', width = COLS): string {
  return char.repeat(width);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PrintItem {
  name:      string;
  qty:       number;
  unitPrice: number;
  options?:  { name: string; price: number }[];
  notes?:    string;
}
export interface PrintReceipt {
  branchName:      string;
  orderNumber:     string;
  tableName?:      string;
  dateTime:        string;
  paymentType:     'CASH' | 'TRANSFER';
  items:           PrintItem[];
  subtotal:        number;
  discountAmount?: number;
  promoName?:      string;
  finalTotal:      number;
  receivedAmount?: number;
  changeAmount?:   number;
  memberName?:     string;
  source?:         string;
}

// ── Fonts — 80mm ─────────────────────────────────────────────────────────────
const THAI = '"Sarabun","Noto Sans Thai","TH Sarabun New",sans-serif';
const F_SM    = `19px ${THAI}`;
const F_NOR   = `24px ${THAI}`;
const F_BOLD  = `bold 26px ${THAI}`;
const F_LG    = `bold 36px ${THAI}`;
const F_2H    = `bold 48px ${THAI}`;          // double-height: shop name, table
const F_TOTAL = `bold 44px ${THAI}`;          // double-height grand total
const F_MONO  = '20px monospace';
const LH_SM  = 28;
const LH_NOR = 36;
const LH_LG  = 52;
const LH_2H  = 64;

// ── buildCanvas (80mm) ────────────────────────────────────────────────────────
function buildCanvas(r: PrintReceipt): HTMLCanvasElement {
  type Cmd =
    | { t: 'txt'; font: string; text: string; x: number; y: number; align: CanvasTextAlign }
    | { t: 'line'; y: number; dashed: boolean };

  const cmds: Cmd[] = [];
  let cy = 16;

  const addTxt = (font: string, str: string, x: number, align: CanvasTextAlign, h: number) => {
    cmds.push({ t: 'txt', font, text: str, x, y: cy, align });
    cy += h;
  };
  const center = (str: string, font = F_NOR, h = LH_NOR) => addTxt(font, str, PW / 2, 'center', h);
  const lft    = (str: string, font = F_NOR, h = LH_NOR) => addTxt(font, str, M, 'left', h);
  const lr = (l: string, r: string, font = F_BOLD, h = LH_NOR) => {
    cmds.push({ t: 'txt', font, text: l, x: M,      y: cy, align: 'left'  });
    cmds.push({ t: 'txt', font, text: r, x: PW - M, y: cy, align: 'right' });
    cy += h;
  };
  const rule = (dashed = false) => { cmds.push({ t: 'line', y: cy, dashed }); cy += 14; };
  const sp   = (h = 6) => { cy += h; };

  // ── Header ──────────────────────────────────────────────────────────────────
  sp(10);
  center(r.branchName, F_2H, LH_2H);
  sp(4);
  center(`ออเดอร์ #${r.orderNumber}`, F_BOLD, LH_NOR);
  center(r.dateTime, F_MONO, LH_SM);
  sp(4);
  r.tableName
    ? center(`โต๊ะ: ${r.tableName}`, F_LG, LH_LG)
    : center('Take Away',            F_LG, LH_LG);
  sp(6); rule();

  // ── Items ────────────────────────────────────────────────────────────────────
  sp(4);
  for (const item of r.items) {
    const tot = `฿${(item.qty * item.unitPrice).toLocaleString()}`;
    lr(`${item.qty}x  ${item.name}`, tot, F_BOLD, LH_NOR);
    item.options?.forEach(o => {
      lr(`   + ${o.name}`, o.price > 0 ? `+฿${o.price}` : '', F_SM, LH_SM);
    });
    if (item.notes) lft(`   ※ ${item.notes}`, F_SM, LH_SM);
    sp(4);
  }

  // ── Totals ───────────────────────────────────────────────────────────────────
  sp(2); rule(); sp(6);
  if (r.discountAmount && r.discountAmount > 0) {
    lr('ราคาก่อนลด', `฿${r.subtotal.toLocaleString()}`, F_BOLD, LH_NOR);
    lr(
      `ส่วนลด${r.promoName ? ` (${r.promoName})` : ''}`,
      `-฿${r.discountAmount.toLocaleString()}`,
      F_BOLD, LH_NOR,
    );
    rule(true); sp(6);
  }
  lr('ยอดสุทธิ', `฿${r.finalTotal.toLocaleString()}`, F_TOTAL, LH_2H);
  sp(8);
  lr('ชำระด้วย', r.paymentType === 'CASH' ? 'เงินสด' : 'โอนเงิน', F_BOLD, LH_NOR);
  if (r.paymentType === 'CASH' && r.receivedAmount != null) {
    lr('รับมา',   `฿${r.receivedAmount.toLocaleString()}`, F_BOLD, LH_NOR);
    lr('เงินทอน', `฿${(r.changeAmount ?? 0).toLocaleString()}`, F_LG, LH_LG);
  }

  // ── Member ───────────────────────────────────────────────────────────────────
  if (r.memberName) {
    sp(6); rule(true);
    center(`สมาชิก: ${r.memberName}`, F_SM, LH_SM);
    center('สะสมแต้มเรียบร้อย ✓', F_SM, LH_SM);
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  sp(10); rule();
  center('ขอบคุณที่ใช้บริการ', F_LG, LH_LG);
  center('Thank you!', F_NOR, LH_NOR);
  cy += 60;

  // ── Render to canvas ─────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width  = PW;
  canvas.height = cy;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PW, cy);

  for (const cmd of cmds) {
    if (cmd.t === 'line') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash(cmd.dashed ? [5, 5] : []);
      ctx.beginPath();
      ctx.moveTo(M, cmd.y);
      ctx.lineTo(PW - M, cmd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.font          = cmd.font;
      ctx.textAlign     = cmd.align;
      ctx.textBaseline  = 'alphabetic';
      ctx.fillStyle     = '#000000';
      ctx.fillText(cmd.text, cmd.x, cmd.y);
    }
  }
  return canvas;
}

// ── canvasToEscPos — width-agnostic, no spread overflow ──────────────────────
function canvasToEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const W = canvas.width;
  const H = canvas.height;
  const bytesPerRow = Math.ceil(W / 8);
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, W, H);

  const HEADER = [
    0x1B, 0x40,                                     // ESC @ — init
    0x1B, 0x61, 0x00,                               // ESC a 0 — left align
    0x1D, 0x76, 0x30, 0x00,                         // GS v 0 — raster bitmap
    bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF,  // xL, xH
    H & 0xFF, (H >> 8) & 0xFF,                      // yL, yH
  ];
  const FOOTER = [0x1B, 0x64, 0x05, 0x1D, 0x56, 0x42, 0x00];

  const result = new Uint8Array(HEADER.length + bytesPerRow * H + FOOTER.length);
  result.set(HEADER, 0);
  let idx = HEADER.length;

  for (let row = 0; row < H; row++) {
    for (let col = 0; col < bytesPerRow; col++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = col * 8 + bit;
        if (x < W) {
          const i = (row * W + x) * 4;
          const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          if (lum < 128) byte |= 0x80 >> bit;
        }
      }
      result[idx++] = byte;
    }
  }
  result.set(FOOTER, idx);
  return result;
}

// ── buildTableQRSlip (async — renders QR via qrcode lib then to ESC/POS) ─────
export async function buildTableQRSlip(
  qrUrl: string,
  tableName: string,
  branchName: string,
  paperMm: 58 | 80 = 80,
): Promise<Uint8Array> {
  const W = paperMm === 80 ? PW : 384;
  const QR_SIZE = Math.min(W - 64, 256);

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qrUrl, {
    width: QR_SIZE,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const NAME_H  = 70;
  const SEP_H   = 18;
  const BADGE_H = 58;
  const GAP_H   = 18;
  const QR_H    = qrCanvas.height;
  const GAP2_H  = 18;
  const SCAN_H  = 40;
  const POWER_H = 28;
  const FEED_H  = 52;
  const PAD_TOP = 18;
  const totalH  = PAD_TOP + NAME_H + SEP_H + BADGE_H + GAP_H + QR_H + GAP2_H + SCAN_H + POWER_H + FEED_H;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, totalH);

  let y = PAD_TOP;

  // Branch name
  ctx.fillStyle    = '#000000';
  ctx.font         = `bold 46px ${THAI}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(branchName, W / 2, y);
  y += NAME_H;

  // Dashed separator
  ctx.strokeStyle = '#000000';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(12, y);
  ctx.lineTo(W - 12, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += SEP_H;

  // Table badge (black bg, white text)
  const bW = Math.min(W - 40, 340);
  const bX = (W - bW) / 2;
  ctx.fillStyle    = '#000000';
  ctx.fillRect(bX, y, bW, 44);
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold 30px ${THAI}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`TABLE: ${tableName}`, W / 2, y + 22);
  y += BADGE_H;

  // QR code
  ctx.drawImage(qrCanvas, (W - qrCanvas.width) / 2, y);
  y += QR_H + GAP2_H;

  // SCAN TO ORDER
  ctx.fillStyle    = '#000000';
  ctx.font         = `bold 26px ${THAI}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SCAN TO ORDER', W / 2, y);
  y += SCAN_H;

  // Powered by
  ctx.fillStyle = '#555555';
  ctx.font      = `17px ${THAI}`;
  ctx.fillText('Powered by ChabaPOS', W / 2, y);

  return canvasToEscPos(canvas);
}

// ── Public API ────────────────────────────────────────────────────────────────
export function buildOrderReceipt(receipt: PrintReceipt): Uint8Array {
  return canvasToEscPos(buildCanvas(receipt));
}
