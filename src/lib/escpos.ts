// ESC/POS receipt builder — canvas raster approach (Thai-safe, no encoding issues)
// Y58BT: 58mm paper, 203 DPI, printable ~48mm = 384 dots
// Standard 80mm:      80mm paper, 203 DPI, printable ~72mm = 576 dots

const PW = 384;          // default print width (58mm)
const BR = PW / 8;       // bytes per raster row = 48

export interface PrintItem {
  name:      string;
  qty:       number;
  unitPrice: number;
  options?:  { name: string; price: number }[];
  notes?:    string;
}

export interface PrintReceipt {
  branchName:     string;
  orderNumber:    string;
  tableName?:     string;
  dateTime:       string;
  paymentType:    'CASH' | 'TRANSFER';
  items:          PrintItem[];
  subtotal:       number;
  discountAmount?: number;
  promoName?:     string;
  finalTotal:     number;
  receivedAmount?: number;
  changeAmount?:  number;
  memberName?:    string;
  source?:        string;
}

// ─────────────────────────────────────────────
// Canvas renderer — draws receipt with Thai font
// ─────────────────────────────────────────────
function buildCanvas(r: PrintReceipt): HTMLCanvasElement {
  const FONT      = '17px "Sarabun","Noto Sans Thai","TH Sarabun New",sans-serif';
  const FONT_BOLD = 'bold 17px "Sarabun","Noto Sans Thai","TH Sarabun New",sans-serif';
  const FONT_SM   = '14px "Sarabun","Noto Sans Thai","TH Sarabun New",sans-serif';
  const FONT_LG   = 'bold 22px "Sarabun","Noto Sans Thai","TH Sarabun New",sans-serif';
  const FONT_TOTAL = 'bold 20px "Sarabun","Noto Sans Thai","TH Sarabun New",sans-serif';
  const LH = 28;
  const LH_SM = 22;

  type Cmd =
    | { t: 'txt'; font: string; text: string; x: number; y: number; align: CanvasTextAlign }
    | { t: 'line'; y: number };

  const cmds: Cmd[] = [];
  let cy = 14;

  const addText = (font: string, text: string, x: number, align: CanvasTextAlign, h: number) => {
    cmds.push({ t: 'txt', font, text, x, y: cy, align });
    cy += h;
  };

  const center = (text: string, font = FONT, h = LH) =>
    addText(font, text, PW / 2, 'center', h);

  const lr = (left: string, right: string, font = FONT, h = LH) => {
    cmds.push({ t: 'txt', font, text: left,  x: 6,       y: cy, align: 'left'  });
    cmds.push({ t: 'txt', font, text: right, x: PW - 6,  y: cy, align: 'right' });
    cy += h;
  };

  const line = () => { cmds.push({ t: 'line', y: cy }); cy += 10; };
  const sp   = (h = 6) => { cy += h; };

  // ── Header ──
  center(r.branchName, FONT_LG, 34);
  center(`ออเดอร์ #${r.orderNumber}`, FONT_SM, LH_SM);
  center(r.dateTime, '13px monospace', LH_SM);
  r.tableName
    ? center(`โต๊ะ: ${r.tableName}`, FONT_BOLD, LH)
    : center('Take Away', FONT, LH_SM);
  sp(4); line();

  // ── Items ──
  for (const item of r.items) {
    const tot = `฿${(item.unitPrice * item.qty).toLocaleString()}`;
    lr(`${item.qty}x  ${item.name}`, tot, FONT_BOLD, LH);
    if (item.options) {
      for (const o of item.options) {
        lr(`     + ${o.name}`, o.price > 0 ? `+฿${o.price}` : '', FONT_SM, LH_SM);
      }
    }
    if (item.notes) {
      addText(FONT_SM, `     * ${item.notes}`, 6, 'left', LH_SM);
    }
    sp(2);
  }

  // ── Totals ──
  sp(4); line();

  if (r.discountAmount && r.discountAmount > 0) {
    lr('ราคาก่อนลด', `฿${r.subtotal.toLocaleString()}`);
    lr(
      `ส่วนลด${r.promoName ? ` (${r.promoName})` : ''}`,
      `-฿${r.discountAmount.toLocaleString()}`,
    );
    line();
  }

  lr('ยอดสุทธิ', `฿${r.finalTotal.toLocaleString()}`, FONT_TOTAL, 34);
  sp(4);
  lr('ชำระด้วย', r.paymentType === 'CASH' ? 'เงินสด' : 'โอนเงิน');

  if (r.paymentType === 'CASH' && r.receivedAmount) {
    lr('รับมา', `฿${r.receivedAmount.toLocaleString()}`);
    lr('เงินทอน', `฿${(r.changeAmount ?? 0).toLocaleString()}`, FONT_BOLD, LH);
  }

  // ── Member ──
  if (r.memberName) {
    sp(4); line();
    center(`สมาชิก: ${r.memberName}`, FONT_SM, LH_SM);
    center('สะสมแต้มเรียบร้อย ✓', FONT_SM, LH_SM);
  }

  // ── Footer ──
  sp(8); line();
  center('ขอบคุณที่ใช้บริการ', FONT_BOLD, LH);
  center('Thank you!', FONT_SM, LH_SM);
  cy += 48; // feed before cut

  // ── Render to canvas ──
  const canvas = document.createElement('canvas');
  canvas.width  = PW;
  canvas.height = cy;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PW, cy);
  ctx.fillStyle = '#000000';

  for (const cmd of cmds) {
    if (cmd.t === 'line') {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, cmd.y - 2);
      ctx.lineTo(PW - 6, cmd.y - 2);
      ctx.stroke();
    } else {
      ctx.font = cmd.font;
      ctx.textAlign = cmd.align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(cmd.text, cmd.x, cmd.y);
    }
  }

  return canvas;
}

// ─────────────────────────────────────────────
// Canvas → ESC/POS binary (GS v 0 raster)
// Width-agnostic: works for both 58mm (384px) and 80mm (576px) canvases
// ─────────────────────────────────────────────
function canvasToEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const W = canvas.width;
  const H = canvas.height;
  const bytesPerRow = Math.ceil(W / 8);
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, W, H);

  const pixels: number[] = [];
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
      pixels.push(byte);
    }
  }

  return new Uint8Array([
    0x1B, 0x40,                                         // ESC @ — init
    0x1B, 0x61, 0x00,                                   // ESC a 0 — left align
    // GS v 0 — print raster bitmap
    0x1D, 0x76, 0x30, 0x00,
    bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF,      // xL, xH (bytes/row)
    H  & 0xFF, (H  >> 8) & 0xFF,                        // yL, yH (row count)
    ...pixels,
    0x1B, 0x64, 0x05,                                   // ESC d 5 — feed 5 lines
    0x1D, 0x56, 0x42, 0x00,                             // GS V B 0 — partial cut
  ]);
}

export function buildOrderReceipt(receipt: PrintReceipt): Uint8Array {
  return canvasToEscPos(buildCanvas(receipt));
}

// ─────────────────────────────────────────────
// Table QR Code slip builder
// Takes the data-URL PNG from the backend (/tables/:id/qrcode)
// and renders a complete thermal-printer slip: header → QR → footer
// Supports 58mm (384 dots) and 80mm (576 dots) paper widths
// ─────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load QR image'));
    img.src = src;
  });
}

async function buildQRCanvas(
  qrDataUrl: string,
  tableName: string,
  branchName: string,
  paperPx: number,
): Promise<HTMLCanvasElement> {
  const qrImg = await loadImage(qrDataUrl);

  // QR box: fill width minus 40px margin on each side
  const QR_SIZE = Math.min(paperPx - 80, 280);
  const QR_X    = Math.floor((paperPx - QR_SIZE) / 2);

  const FONT_NAME  = `bold 22px "Sarabun","Noto Sans Thai",sans-serif`;
  const FONT_BADGE = `bold 24px "Sarabun","Noto Sans Thai",sans-serif`;
  const FONT_SCAN  = `bold 16px "Sarabun","Noto Sans Thai",sans-serif`;
  const FONT_SMALL = `11px sans-serif`;

  const TOP_PAD   = 16;
  const NAME_H    = 32;
  const SEP_H     = 14;   // dashed line + gap
  const BADGE_H   = 52;   // filled rect (44px) + margin
  const GAP       = 16;
  const SCAN_H    = 28;
  const POWERED_H = 22;
  const BOTTOM_H  = 60;   // separator + feed before cut

  const totalH = TOP_PAD + NAME_H + SEP_H + BADGE_H + GAP + QR_SIZE + GAP + SCAN_H + POWERED_H + BOTTOM_H;

  const canvas = document.createElement('canvas');
  canvas.width  = paperPx;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, paperPx, totalH);

  let y = TOP_PAD;

  // ── Branch name ──
  ctx.fillStyle = '#000000';
  ctx.font = FONT_NAME;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(branchName.toUpperCase(), paperPx / 2, y);
  y += NAME_H;

  // ── Dashed separator ──
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(12, y + 3);
  ctx.lineTo(paperPx - 12, y + 3);
  ctx.stroke();
  ctx.setLineDash([]);
  y += SEP_H;

  // ── Table badge (black background, white text) ──
  const BADGE_W = Math.min(paperPx - 40, 240);
  const BADGE_X = Math.floor((paperPx - BADGE_W) / 2);
  ctx.fillStyle = '#000000';
  ctx.fillRect(BADGE_X, y, BADGE_W, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = FONT_BADGE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`TABLE: ${tableName}`, paperPx / 2, y + 22);
  y += BADGE_H;

  // ── QR Code image ──
  ctx.drawImage(qrImg, QR_X, y, QR_SIZE, QR_SIZE);
  y += QR_SIZE + GAP;

  // ── SCAN TO ORDER ──
  ctx.fillStyle = '#000000';
  ctx.font = FONT_SCAN;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SCAN TO ORDER', paperPx / 2, y);
  y += SCAN_H;

  // ── Powered by ──
  ctx.fillStyle = '#777777';
  ctx.font = FONT_SMALL;
  ctx.fillText('Powered by ChabaPOS', paperPx / 2, y);
  y += POWERED_H;

  // ── Bottom dashed separator ──
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(12, y + 3);
  ctx.lineTo(paperPx - 12, y + 3);
  ctx.stroke();
  ctx.setLineDash([]);

  return canvas;
}

/**
 * Build an ESC/POS binary payload for a table QR Code slip.
 *
 * @param qrDataUrl  - data:image/png;base64 from GET /tables/:id/qrcode
 * @param tableName  - e.g. "T1", "VIP-1"
 * @param branchName - displayed at the top of the slip
 * @param paperMm    - 80 (default, 576 dots) or 58 (384 dots) — match your printer
 */
export async function buildTableQRSlip(
  qrDataUrl: string,
  tableName: string,
  branchName: string,
  paperMm: 58 | 80 = 80,
): Promise<Uint8Array> {
  const paperPx = paperMm === 80 ? 576 : 384;
  const canvas = await buildQRCanvas(qrDataUrl, tableName, branchName, paperPx);
  return canvasToEscPos(canvas);
}
