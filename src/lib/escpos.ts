// ESC/POS receipt builder — canvas raster approach (Thai-safe, no encoding issues)
// Y58BT: 58mm paper, 203 DPI, printable ~48mm = 384 dots

const PW = 384;          // print width in dots
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
// ─────────────────────────────────────────────
function canvasToEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, W, H);

  const pixels: number[] = [];
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < BR; col++) {
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
    0x1B, 0x40,                       // ESC @ — init
    0x1B, 0x61, 0x00,                 // ESC a 0 — left align
    // GS v 0 — print raster bitmap
    0x1D, 0x76, 0x30, 0x00,
    BR & 0xFF, (BR >> 8) & 0xFF,      // xL, xH (bytes/row)
    H  & 0xFF, (H  >> 8) & 0xFF,      // yL, yH (row count)
    ...pixels,
    0x1B, 0x64, 0x05,                 // ESC d 5 — feed 5 lines
    0x1D, 0x56, 0x42, 0x00,           // GS V B 0 — partial cut
  ]);
}

export function buildOrderReceipt(receipt: PrintReceipt): Uint8Array {
  return canvasToEscPos(buildCanvas(receipt));
}
