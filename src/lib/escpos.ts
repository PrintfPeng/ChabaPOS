// ESC/POS receipt builder — canvas raster, Thai-safe
// 80mm paper: 203 DPI → printable ≈ 72mm = 576 dots
//
// WHY canvas raster?
// Bluetooth thermal printers use TIS-620 / Windows-874 byte encoding.
// Sending UTF-8 Thai bytes produces garbled "alien" text.
// Canvas converts Thai glyphs to a 1-bit monochrome bitmap which the printer
// receives as raw pixel data (GS v 0). No character encoding involved at all.

import QRCode from 'qrcode';

const PW   = 576;   // printable width in dots  (80mm @ 203 DPI)
const M    = 14;    // left / right margin in px
const COLS = 48;    // reference column count for text-mode helper exports

const THAI = '"Sarabun","Noto Sans Thai","TH Sarabun New",sans-serif';

// ── Font definitions ──────────────────────────────────────────────────────────
const F_BOLD = `bold 30px ${THAI}`;  // item names, labels, totals
const F_NOR  = `30px ${THAI}`;       // body text
const F_SM   = `26px ${THAI}`;       // options, notes, small print
const F_MONO = `27px "Courier New","Lucida Console",monospace`; // order#, timestamps

// Line heights (px to advance cy after each line)
const LH_NOR  = 42;
const LH_SM   = 35;

// ── Two-line item layout ───────────────────────────────────────────────────────
//   Line 1:  [qty 66px]                             [price right]
//   Line 2:           [name — full remaining width]
//   Line 3+:          [options / notes]
//   ← M=14  ────────────────────────────────────────────────── M=14 →
const QTY_W_PX   = 66;                          // "99x " at F_BOLD 30px ≈ 60px
const NAME_X     = M + QTY_W_PX;               // 80px — indent for name & options
const PRICE_X    = PW - M;                     // right-align anchor
const NAME_MAX_W = PW - NAME_X - M;            // ≈ 482px — name has full remaining width

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
  staffName?:      string;
}

export interface KitchenSlip {
  orderNumber: string;
  tableName?:  string;
  dateTime:    string;
  items:       PrintItem[];
}

export interface ShiftSummaryReceipt {
  branchName: string;
  openedAt: Date;
  closedAt: Date | null;
  openedByName: string;
  closedByName: string | null;
  startingCash: number;
  actualCash: number | null;
  expectedCash: number | null;
  shortOver: number | null;
  totalCashSales: number;
  aggregatedItems: { name: string; qty: number; totalPrice: number }[];
}

// ── Text-mode helpers (exported utilities) ────────────────────────────────────
// Count printer column positions. Each Unicode code point = 1 position
// (matches TIS-620 grid used by thermal printers).
function cw(s: string): number { return [...s].length; }

export function formatTwoColumns(left: string, right: string, width = COLS): string {
  const rw = cw(right);
  const avail = width - rw;
  if (cw(left) >= avail) return [...left].slice(0, avail - 1).join('') + '…' + right;
  return left + ' '.repeat(avail - cw(left)) + right;
}

const QTY_C = 4, PRICE_C = 10, NAME_C = COLS - QTY_C - PRICE_C;
export function formatItemRow(qty: string, name: string, price: string): string {
  const q = qty.slice(0, QTY_C).padEnd(QTY_C);
  const p = price.padStart(PRICE_C).slice(-PRICE_C);
  const ch = [...name];
  if (ch.length <= NAME_C) return q + name + ' '.repeat(Math.max(0, NAME_C - ch.length)) + p;
  const rows = [q + ch.slice(0, NAME_C).join('') + p];
  let rest = ch.slice(NAME_C).join('');
  while (cw(rest) > 0) {
    const sl = [...rest].slice(0, COLS - QTY_C);
    rows.push(' '.repeat(QTY_C) + sl.join(''));
    rest = [...rest].slice(COLS - QTY_C).join('');
  }
  return rows.join('\n');
}
export function formatOptionRow(optionName: string, optionPrice?: string): string {
  const prefix = '  + ';
  if (!optionPrice || optionPrice === '' || optionPrice === '+0.00') return prefix + optionName;
  return formatTwoColumns(prefix + optionName, optionPrice);
}
export function formatLine(l: string, r: string, w = COLS): string { return formatTwoColumns(l, r, w); }
export function centerLine(text: string, width = COLS): string {
  const pad = Math.max(0, Math.floor((width - cw(text)) / 2));
  return ' '.repeat(pad) + text;
}
export function dividerLine(char = '-', width = COLS): string { return char.repeat(width); }

// ── Price formatter ────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Canvas builder ────────────────────────────────────────────────────────────
type Cmd =
  | { t: 'txt'; font: string; text: string; x: number; y: number; align: CanvasTextAlign }
  | { t: 'sep'; y: number; dashed: boolean };

function buildCanvas(r: PrintReceipt): HTMLCanvasElement {
  // Off-screen context used only for measureText() during name wrapping
  const mc = document.createElement('canvas').getContext('2d')!;

  // Wrap `text` to fit within `maxW` pixels using `font`.
  // Uses character-by-character splitting — correct for Thai (no word spaces).
  function wrap(text: string, font: string, maxW: number): string[] {
    mc.font = font;
    if (mc.measureText(text).width <= maxW) return [text];
    const chars  = [...text]; // unicode code points
    const lines: string[] = [];
    let   line   = '';
    for (const ch of chars) {
      if (mc.measureText(line + ch).width <= maxW) {
        line += ch;
      } else {
        if (line) lines.push(line);
        line = ch;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [text];
  }

  // ── Zone 1: Header — compute auto-fit FIRST so cy starts correctly ──────────
  // Auto-fit shop name: shrink from 57px until text fits within printable width.
  // Needed because ASCII shop names (e.g. "ChabaBurger_YALA") are wider than Thai at the same px.
  // Must run before cy is initialised: cy must be ≥ font ascent or the canvas clips the top of
  // the first glyph (cap-height ≈ 0.72×size extends above the baseline into negative y territory).
  const SHOP_MAX_W = PW - 2 * M;  // 548px
  let shopSize = 57;
  mc.font = `bold ${shopSize}px ${THAI}`;
  while (mc.measureText(r.branchName).width > SHOP_MAX_W && shopSize > 24) {
    shopSize -= 1;
    mc.font = `bold ${shopSize}px ${THAI}`;
  }
  const F_SHOP_FIT   = `bold ${shopSize}px ${THAI}`;
  const LH_SHOP_FIT  = Math.round(shopSize * 1.32);

  const cmds: Cmd[] = [];
  // cy starts at the shop-name baseline. 0.88×size gives enough room above for cap-height and
  // diacritics (Latin cap ≈ 0.72×, Thai tone marks ≈ 0.85×) without wasting paper at the top.
  let cy = Math.ceil(shopSize * 0.88);

  // addT: queue a text command and advance cy
  const addT = (font: string, text: string, x: number, align: CanvasTextAlign, lh: number) => {
    cmds.push({ t: 'txt', font, text, x, y: cy, align });
    cy += lh;
  };

  // Shorthand helpers
  const C  = (t: string, f = F_NOR, lh = LH_NOR) => addT(f, t, PW / 2, 'center', lh);
  const LR = (l: string, r: string, f = F_NOR, lh = LH_NOR) => {
    cmds.push({ t: 'txt', font: f, text: l, x: M,      y: cy, align: 'left'  });
    cmds.push({ t: 'txt', font: f, text: r, x: PW - M, y: cy, align: 'right' });
    cy += lh;
  };

  // sep: horizontal divider line with mathematically-safe gap.
  //
  // Gap analysis (F_BOLD 30px, ascent ≈ 24px, descent ≈ 6px):
  //   prev text baseline at cy_prev, cy advanced by LH_NOR (42).
  //   +15 before line → line clears prev descenders with margin.
  //   +33 after  line → next text top = next_base - ascent = (line_y + 33) - 24 = line_y + 9.
  //   So next text's cap-height is always 9px BELOW the line. No overlap possible.
  const sep = (dashed = false) => {
    cy += 15;
    cmds.push({ t: 'sep', y: cy, dashed });
    cy += 33;
  };

  const sp = (h = 8) => { cy += h; };

  C(r.branchName, F_SHOP_FIT, LH_SHOP_FIT);
  sp(4);
  C('ใบเสร็จรับเงิน / Receipt', F_BOLD, LH_NOR);
  sp(4);

  // ── Zone 2: Order meta ──────────────────────────────────────────────────────
  sep();

  const dtStr    = r.dateTime.replace('T', ' ');
  const spIdx    = dtStr.indexOf(' ');
  const datePart = spIdx > 0 ? dtStr.slice(0, spIdx)           : dtStr;
  const timePart = spIdx > 0 ? dtStr.slice(spIdx + 1, spIdx + 6) : '';
  const orderType = r.source === 'DELIVERY' ? 'Delivery'
                  : r.tableName             ? 'กินที่ร้าน'
                  :                           'Take Away';

  LR(`ออเดอร์: #${r.orderNumber}`, `โต๊ะ: ${r.tableName ?? 'Take Away'}`);
  if (r.staffName) LR(`พนักงาน: ${r.staffName}`, `ประเภท: ${orderType}`);
  LR(`วันที่: ${datePart}`, `เวลา: ${timePart}`, F_MONO);

  sep();

  // ── Zone 3: Items ───────────────────────────────────────────────────────────
  sp(4);
  for (const item of r.items) {
    const priceStr  = `฿${fmt(item.qty * item.unitPrice)}`;
    const nameLines = wrap(item.name, F_BOLD, NAME_MAX_W);

    // Line 1: qty (left) + price (right) — name gets its own dedicated line below
    cmds.push({ t: 'txt', font: F_BOLD, text: `${item.qty}x`, x: M,       y: cy, align: 'left'  });
    cmds.push({ t: 'txt', font: F_BOLD, text: priceStr,        x: PRICE_X, y: cy, align: 'right' });
    cy += LH_NOR;

    // Line 2+: item name indented under qty, full remaining width
    for (const line of nameLines) {
      cmds.push({ t: 'txt', font: F_BOLD, text: line, x: NAME_X, y: cy, align: 'left' });
      cy += LH_NOR;
    }

    // Option rows
    item.options?.forEach(o => {
      const op = o.price > 0 ? `+฿${fmt(o.price)}` : '';
      cmds.push({ t: 'txt', font: F_SM, text: `  + ${o.name}`, x: NAME_X, y: cy, align: 'left' });
      if (op) cmds.push({ t: 'txt', font: F_SM, text: op, x: PRICE_X, y: cy, align: 'right' });
      cy += LH_SM;
    });

    if (item.notes) {
      cmds.push({ t: 'txt', font: F_SM, text: `  ※ ${item.notes}`, x: NAME_X, y: cy, align: 'left' });
      cy += LH_SM;
    }

    sp(4);
  }

  // ── Zone 4: Totals & payment ─────────────────────────────────────────────────
  sep();
  LR(`จำนวนรายการ: ${r.items.length}`, `Subtotal: ฿${fmt(r.subtotal)}`);

  if (r.discountAmount && r.discountAmount > 0) {
    const label = r.promoName ? `ส่วนลด (${r.promoName})` : 'ส่วนลด';
    LR(label, `-฿${fmt(r.discountAmount)}`);
  }

  sep();
  LR('ยอดรวมสุทธิ / Total', `฿${fmt(r.finalTotal)}`, F_BOLD, LH_NOR + 6);
  sep();

  const payLabel = r.paymentType === 'CASH' ? 'เงินสด' : 'สแกน QR / โอนเงิน';
  LR('ชำระด้วย:', payLabel);
  if (r.paymentType === 'CASH' && r.receivedAmount != null) {
    LR('รับเงิน:',  `฿${fmt(r.receivedAmount)}`);
    LR('เงินทอน:', `฿${fmt(r.changeAmount ?? 0)}`, F_BOLD);
  }

  sep();

  // ── Zone 5: Footer ──────────────────────────────────────────────────────────
  if (r.memberName) {
    C(`สมาชิก: ${r.memberName}`, F_SM, LH_SM);
    C('สะสมแต้มเรียบร้อย ✓', F_SM, LH_SM);
    sep();
    sp(4);
  }

  C('ขอบคุณที่ใช้บริการ / Thank You!', F_BOLD, LH_NOR);
  C('Powered by ChabaPOS', F_SM, LH_SM);
  cy += 72;  // paper feed space before auto-cut

  // ── Render command list to canvas ─────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width  = PW;
  canvas.height = cy;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PW, cy);

  for (const cmd of cmds) {
    if (cmd.t === 'sep') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash(cmd.dashed ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(M, cmd.y);
      ctx.lineTo(PW - M, cmd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.font         = cmd.font;
      ctx.textAlign    = cmd.align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle    = '#000000';
      ctx.fillText(cmd.text, cmd.x, cmd.y);
    }
  }

  return canvas;
}

// ── canvasToEscPos — GS v 0 raster bitmap, no array-spread overflow ───────────
function canvasToEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const W   = canvas.width;
  const H   = canvas.height;
  const bpr = Math.ceil(W / 8);  // bytes per raster row
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, W, H);

  const HDR = [
    0x1B, 0x40,                                     // ESC @ — initialize
    0x1B, 0x61, 0x00,                               // ESC a 0 — left align
    0x1D, 0x76, 0x30, 0x00,                         // GS v 0 — raster bitmap
    bpr & 0xFF, (bpr >> 8) & 0xFF,                  // xL, xH (bytes/row)
    H   & 0xFF, (H   >> 8) & 0xFF,                  // yL, yH (rows)
  ];
  const FTR = [0x1B, 0x64, 0x05, 0x1D, 0x56, 0x42, 0x00];

  const out = new Uint8Array(HDR.length + bpr * H + FTR.length);
  out.set(HDR, 0);
  let idx = HDR.length;

  for (let row = 0; row < H; row++) {
    for (let col = 0; col < bpr; col++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = col * 8 + bit;
        if (x < W) {
          const i   = (row * W + x) * 4;
          const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          if (lum < 128) byte |= 0x80 >> bit;
        }
      }
      out[idx++] = byte;
    }
  }
  out.set(FTR, idx);
  return out;
}

// ── buildTableQRSlip ──────────────────────────────────────────────────────────
export async function buildTableQRSlip(
  qrUrl:      string,
  tableName:  string,
  branchName: string,
  paperMm:    58 | 80 = 80,
): Promise<Uint8Array> {
  const W       = paperMm === 80 ? PW : 384;
  const QR_SIZE = Math.min(W - 64, 256);

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qrUrl, {
    width: QR_SIZE, margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const PAD_TOP = 18; const NAME_H  = 70; const SEP_H   = 18;
  const BADGE_H = 58; const GAP_H   = 18; const QR_H    = qrCanvas.height;
  const GAP2_H  = 18; const SCAN_H  = 40; const POWER_H = 28; const FEED_H = 52;
  const totalH = PAD_TOP + NAME_H + SEP_H + BADGE_H + GAP_H + QR_H + GAP2_H + SCAN_H + POWER_H + FEED_H;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, totalH);

  let y = PAD_TOP;

  ctx.fillStyle = '#000000';
  ctx.font = `bold 46px ${THAI}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(branchName, W / 2, y); y += NAME_H;

  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(W - 12, y); ctx.stroke();
  ctx.setLineDash([]); y += SEP_H;

  const bW = Math.min(W - 40, 340), bX = (W - bW) / 2;
  ctx.fillStyle = '#000000'; ctx.fillRect(bX, y, bW, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 30px ${THAI}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`TABLE: ${tableName}`, W / 2, y + 22); y += BADGE_H;

  ctx.drawImage(qrCanvas, (W - qrCanvas.width) / 2, y); y += QR_H + GAP2_H;

  ctx.fillStyle = '#000000';
  ctx.font = `bold 26px ${THAI}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('SCAN TO ORDER', W / 2, y); y += SCAN_H;

  ctx.fillStyle = '#555555';
  ctx.font = `17px ${THAI}`;
  ctx.fillText('Powered by ChabaPOS', W / 2, y);

  return canvasToEscPos(canvas);
}

// ── Public API ────────────────────────────────────────────────────────────────
export function buildOrderReceipt(receipt: PrintReceipt): Uint8Array {
  return canvasToEscPos(buildCanvas(receipt));
}

function buildShiftSummaryCanvas(r: ShiftSummaryReceipt): HTMLCanvasElement {
  const mc = document.createElement('canvas').getContext('2d')!;

  function wrap(text: string, font: string, maxW: number): string[] {
    mc.font = font;
    if (mc.measureText(text).width <= maxW) return [text];
    const chars  = [...text];
    const lines: string[] = [];
    let   line   = '';
    for (const ch of chars) {
      if (mc.measureText(line + ch).width <= maxW) {
        line += ch;
      } else {
        if (line) lines.push(line);
        line = ch;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [text];
  }

  const cmds: Cmd[] = [];
  let cy = 40; // initial y offset

  const addT = (font: string, text: string, x: number, align: CanvasTextAlign, lh: number) => {
    cmds.push({ t: 'txt', font, text, x, y: cy, align });
    cy += lh;
  };

  const C  = (t: string, f = F_NOR, lh = LH_NOR) => addT(f, t, PW / 2, 'center', lh);
  const LR = (l: string, r: string, f = F_NOR, lh = LH_NOR) => {
    cmds.push({ t: 'txt', font: f, text: l, x: M,      y: cy, align: 'left'  });
    cmds.push({ t: 'txt', font: f, text: r, x: PW - M, y: cy, align: 'right' });
    cy += lh;
  };
  const sep = (dashed = false) => {
    cy += 15;
    cmds.push({ t: 'sep', y: cy, dashed });
    cy += 33;
  };
  const sp = (h = 8) => { cy += h; };

  // Header
  C(r.branchName, F_BOLD, 46);
  sp(4);
  C('ใบสรุปยอดขายประจำกะ', F_BOLD, LH_NOR);
  sp(4);

  // Dates & Staff
  sep();
  const formatDateTime = (d: Date | string) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' });
  };
  LR(`เปิดกะ: ${formatDateTime(r.openedAt)}`, `โดย: ${r.openedByName}`, F_SM, LH_SM);
  if (r.closedAt) {
    LR(`ปิดกะ: ${formatDateTime(r.closedAt)}`, `โดย: ${r.closedByName || '-'}`, F_SM, LH_SM);
  }
  
  // Items List
  sep();
  C('สรุปรายการอาหาร / เมนู', F_BOLD, LH_NOR);
  sp(4);

  for (const item of r.aggregatedItems) {
    const priceStr  = `฿${fmt(item.totalPrice)}`;
    const nameLines = wrap(item.name, F_NOR, NAME_MAX_W);

    cmds.push({ t: 'txt', font: F_BOLD, text: `${item.qty}x`, x: M,       y: cy, align: 'left'  });
    cmds.push({ t: 'txt', font: F_BOLD, text: priceStr,        x: PRICE_X, y: cy, align: 'right' });
    cy += LH_NOR;

    for (const line of nameLines) {
      cmds.push({ t: 'txt', font: F_NOR, text: line, x: NAME_X, y: cy, align: 'left' });
      cy += LH_NOR;
    }
    sp(4);
  }

  // Financial Summary
  sep();
  C('สรุปยอดการเงิน (เงินสด)', F_BOLD, LH_NOR);
  sp(4);
  
  LR('เงินทอนเริ่มต้น:', `฿${fmt(r.startingCash)}`);
  LR('ยอดขายเงินสดทั้งหมด:', `฿${fmt(r.totalCashSales)}`);
  if (r.expectedCash !== null) {
    LR('ยอดที่ควรมีในลิ้นชัก:', `฿${fmt(r.expectedCash)}`, F_BOLD);
  }
  
  sep();
  if (r.actualCash !== null) {
    LR('เงินที่นับได้จริง:', `฿${fmt(r.actualCash)}`, F_BOLD);
    if (r.shortOver !== null) {
      const diffText = r.shortOver === 0 ? 'ยอดตรง' : r.shortOver > 0 ? 'เงินเกิน' : 'เงินขาด';
      LR(`ส่วนต่าง (${diffText}):`, `฿${fmt(Math.abs(r.shortOver))}`, F_BOLD);
    }
  }

  // Footer
  sep();
  C('ขอบคุณที่ใช้บริการ / Thank You!', F_BOLD, LH_NOR);
  C('Powered by ChabaPOS', F_SM, LH_SM);
  cy += 72;  // paper feed space before auto-cut

  // Render to canvas
  const canvas = document.createElement('canvas');
  canvas.width  = PW;
  canvas.height = cy;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PW, cy);

  for (const cmd of cmds) {
    if (cmd.t === 'sep') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash(cmd.dashed ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(M, cmd.y);
      ctx.lineTo(PW - M, cmd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.font         = cmd.font;
      ctx.textAlign    = cmd.align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle    = '#000000';
      ctx.fillText(cmd.text, cmd.x, cmd.y);
    }
  }

  return canvas;
}

export function buildShiftSummaryReceipt(receipt: ShiftSummaryReceipt): Uint8Array {
  return canvasToEscPos(buildShiftSummaryCanvas(receipt));
}

// ── Kitchen slip — large fonts, no price header, emphasis on readability ──────
function buildKitchenSlipCanvas(slip: KitchenSlip): HTMLCanvasElement {
  const mc = document.createElement('canvas').getContext('2d')!;

  function wrap(text: string, font: string, maxW: number): string[] {
    mc.font = font;
    if (mc.measureText(text).width <= maxW) return [text];
    const chars = [...text];
    const lines: string[] = [];
    let line = '';
    for (const ch of chars) {
      if (mc.measureText(line + ch).width <= maxW) { line += ch; }
      else { if (line) lines.push(line); line = ch; }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [text];
  }

  const F_KH    = `bold 44px ${THAI}`;
  const F_KSB   = `bold 34px ${THAI}`;
  const F_KQTY  = `bold 52px ${THAI}`;
  const F_KNAME = `bold 40px ${THAI}`;
  const F_KOPT  = `34px ${THAI}`;
  const F_KMETA = `28px ${THAI}`;

  const LH_KH    = 58;
  const LH_KSB   = 46;
  const LH_KQTY  = 66;
  const LH_KNAME = 54;
  const LH_KOPT  = 46;
  const LH_KMETA = 38;
  const QTY_COL  = 92;

  const cmds: Cmd[] = [];
  let cy = 46;

  const addT = (font: string, text: string, x: number, align: CanvasTextAlign, lh: number) => {
    cmds.push({ t: 'txt', font, text, x, y: cy, align });
    cy += lh;
  };
  const C  = (t: string, f: string, lh: number) => addT(f, t, PW / 2, 'center', lh);
  const LR = (l: string, r: string, f: string, lh: number) => {
    cmds.push({ t: 'txt', font: f, text: l, x: M,      y: cy, align: 'left'  });
    cmds.push({ t: 'txt', font: f, text: r, x: PW - M, y: cy, align: 'right' });
    cy += lh;
  };
  const sep = () => { cy += 12; cmds.push({ t: 'sep', y: cy, dashed: false }); cy += 26; };
  const sp  = (h = 8) => { cy += h; };

  // Header
  C('ใบสั่งอาหาร', F_KH, LH_KH);
  C('■  Kitchen Order  ■', F_KSB, LH_KSB);
  sp(4);
  sep();

  // Meta
  const dtStr    = slip.dateTime.replace('T', ' ');
  const spIdx    = dtStr.indexOf(' ');
  const datePart = spIdx > 0 ? dtStr.slice(0, spIdx) : dtStr;
  const timePart = spIdx > 0 ? dtStr.slice(spIdx + 1, spIdx + 6) : '';

  LR(`#${slip.orderNumber}`, slip.tableName ?? 'Take Away', F_KSB, LH_KSB);
  LR(datePart, timePart, F_KMETA, LH_KMETA);
  sep();

  // Items
  sp(4);
  const nameMaxW = PW - M - QTY_COL - M;

  for (const item of slip.items) {
    const nameLines = wrap(item.name, F_KNAME, nameMaxW);

    cmds.push({ t: 'txt', font: F_KQTY,  text: `${item.qty}x`, x: M,            y: cy, align: 'left' });
    cmds.push({ t: 'txt', font: F_KNAME, text: nameLines[0],    x: M + QTY_COL, y: cy, align: 'left' });
    cy += LH_KQTY;

    for (let i = 1; i < nameLines.length; i++) {
      cmds.push({ t: 'txt', font: F_KNAME, text: nameLines[i], x: M + QTY_COL, y: cy, align: 'left' });
      cy += LH_KNAME;
    }

    item.options?.forEach(o => {
      cmds.push({ t: 'txt', font: F_KOPT, text: `  + ${o.name}`, x: M + QTY_COL, y: cy, align: 'left' });
      cy += LH_KOPT;
    });

    if (item.notes) {
      cmds.push({ t: 'txt', font: F_KOPT, text: `  ※ ${item.notes}`, x: M + QTY_COL, y: cy, align: 'left' });
      cy += LH_KOPT;
    }

    sep();
  }

  cy += 60;

  const canvas = document.createElement('canvas');
  canvas.width  = PW;
  canvas.height = cy;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PW, cy);

  for (const cmd of cmds) {
    if (cmd.t === 'sep') {
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(M, cmd.y); ctx.lineTo(PW - M, cmd.y); ctx.stroke();
    } else {
      ctx.font = cmd.font; ctx.textAlign = cmd.align;
      ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#000000';
      ctx.fillText(cmd.text, cmd.x, cmd.y);
    }
  }

  return canvas;
}

export function buildKitchenSlip(slip: KitchenSlip): Uint8Array {
  return canvasToEscPos(buildKitchenSlipCanvas(slip));
}

// ── Purchase order slip — supplier info + material checklist for procurement ──
export interface PurchaseOrderPrintItem {
  name:      string;
  category?: string;
  quantity:  number;
  unit:      string;
}
export interface PurchaseOrderSlip {
  branchName:      string;
  poNumber:        string;
  dateTime:        string;
  supplierName:    string;
  supplierPhone?:  string;
  supplierLineId?: string;
  items:           PurchaseOrderPrintItem[];
}

function buildPurchaseOrderCanvas(po: PurchaseOrderSlip): HTMLCanvasElement {
  const mc = document.createElement('canvas').getContext('2d')!;

  function wrap(text: string, font: string, maxW: number): string[] {
    mc.font = font;
    if (mc.measureText(text).width <= maxW) return [text];
    const chars = [...text];
    const lines: string[] = [];
    let line = '';
    for (const ch of chars) {
      if (mc.measureText(line + ch).width <= maxW) { line += ch; }
      else { if (line) lines.push(line); line = ch; }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [text];
  }

  const cmds: Cmd[] = [];
  let cy = 46;

  const addT = (font: string, text: string, x: number, align: CanvasTextAlign, lh: number) => {
    cmds.push({ t: 'txt', font, text, x, y: cy, align });
    cy += lh;
  };
  const C  = (t: string, f = F_NOR, lh = LH_NOR) => addT(f, t, PW / 2, 'center', lh);
  const LR = (l: string, r: string, f = F_NOR, lh = LH_NOR) => {
    cmds.push({ t: 'txt', font: f, text: l, x: M,      y: cy, align: 'left'  });
    cmds.push({ t: 'txt', font: f, text: r, x: PW - M, y: cy, align: 'right' });
    cy += lh;
  };
  const sep = (dashed = false) => { cy += 15; cmds.push({ t: 'sep', y: cy, dashed }); cy += 33; };
  const sp  = (h = 8) => { cy += h; };

  // ── Zone 1: Header ──────────────────────────────────────────────────────────
  C(po.branchName, F_BOLD, 46);
  sp(4);
  C('ใบสั่งซื้อวัตถุดิบ', F_BOLD, LH_NOR);
  C('Purchase Order', F_SM, LH_SM);
  sp(4);
  sep();

  // ── Zone 2: Doc info ────────────────────────────────────────────────────────
  LR(`เลขที่: ${po.poNumber}`, po.dateTime, F_MONO, LH_NOR);
  sep();

  // ── Zone 3: Supplier info ───────────────────────────────────────────────────
  C('ข้อมูลร้านค้า / Supplier', F_BOLD, LH_NOR);
  sp(4);
  for (const line of wrap(po.supplierName, F_BOLD, PW - 2 * M)) {
    addT(F_BOLD, line, M, 'left', LH_NOR);
  }
  if (po.supplierPhone)  addT(F_SM, `โทร: ${po.supplierPhone}`, M, 'left', LH_SM);
  if (po.supplierLineId) addT(F_SM, `LINE ID: ${po.supplierLineId}`, M, 'left', LH_SM);
  sep();

  // ── Zone 4: Items table (รายการ | หมวดหมู่ | จำนวน | หน่วย) ─────────────────
  C(`รายการวัตถุดิบ (${po.items.length} รายการ)`, F_BOLD, LH_NOR);
  sp(4);

  po.items.forEach((item, idx) => {
    const nameLines = wrap(`${idx + 1}. ${item.name}`, F_BOLD, PW - 2 * M);
    for (const line of nameLines) {
      addT(F_BOLD, line, M, 'left', LH_NOR);
    }
    LR(`   หมวดหมู่: ${item.category ?? '-'}`, `${item.quantity} ${item.unit}`, F_SM, LH_SM);
    sp(6);
  });

  sep();

  // ── Zone 5: Summary ─────────────────────────────────────────────────────────
  LR('จำนวนรายการทั้งหมด:', `${po.items.length} รายการ`, F_BOLD, LH_NOR);
  sep();

  // ── Zone 6: Footer — signatures ─────────────────────────────────────────────
  sp(40);
  addT(F_NOR, 'ผู้จัดซื้อ ...........................................', M, 'left', LH_NOR);
  sp(36);
  addT(F_NOR, 'ผู้ตรวจสอบ ...........................................', M, 'left', LH_NOR);
  cy += 72;  // paper feed space before auto-cut

  // ── Render command list to canvas ─────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width  = PW;
  canvas.height = cy;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PW, cy);

  for (const cmd of cmds) {
    if (cmd.t === 'sep') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash(cmd.dashed ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(M, cmd.y);
      ctx.lineTo(PW - M, cmd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.font         = cmd.font;
      ctx.textAlign    = cmd.align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle    = '#000000';
      ctx.fillText(cmd.text, cmd.x, cmd.y);
    }
  }

  return canvas;
}

export function buildPurchaseOrderSlip(po: PurchaseOrderSlip): Uint8Array {
  return canvasToEscPos(buildPurchaseOrderCanvas(po));
}
