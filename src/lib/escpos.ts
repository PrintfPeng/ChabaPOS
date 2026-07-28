// ESC/POS receipt builder — text mode (80mm, 48 chars/line) + canvas QR slip
// Text receipts use direct ESC/POS text commands encoded as UTF-8.
// QR slips keep canvas raster since QR images must be rendered graphically.

import QRCode from 'qrcode';

const COLS = 48;
const enc  = new TextEncoder(); // UTF-8

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

// ── ESC/POS command bytes ─────────────────────────────────────────────────────
const INIT    = new Uint8Array([0x1B, 0x40]);             // ESC @   — init
const AL      = new Uint8Array([0x1B, 0x61, 0x00]);       // ESC a 0 — left
const AC      = new Uint8Array([0x1B, 0x61, 0x01]);       // ESC a 1 — center
const BON     = new Uint8Array([0x1B, 0x45, 0x01]);       // ESC E 1 — bold on
const BOFF    = new Uint8Array([0x1B, 0x45, 0x00]);       // ESC E 0 — bold off
// ESC ! n: bit3=bold, bit4=double-height, bit5=double-width
const SZ_DHDW = new Uint8Array([0x1B, 0x21, 0x38]);       // bold + DH + DW (shop name)
const SZ_DH   = new Uint8Array([0x1B, 0x21, 0x18]);       // bold + DH only  (section label)
const SZ_NOR  = new Uint8Array([0x1B, 0x21, 0x00]);       // normal size
const FEED    = new Uint8Array([0x1B, 0x64, 0x03]);       // ESC d 3 — feed 3 lines
const CUT     = new Uint8Array([0x1D, 0x56, 0x42, 0x00]); // GS V B 0 — partial cut
const NL      = new Uint8Array([0x0A]);                   // line feed

// Dividers (include trailing \n so they stand alone on their line)
const DIV  = '-'.repeat(COLS) + '\n'; // ------------------------------------------------
const DDIV = '='.repeat(COLS) + '\n'; // ================================================

// ── Byte-concat helper (no array-spread, avoids argument-count limit) ─────────
function join(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let  i    = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

function tx(s: string):  Uint8Array { return enc.encode(s); }
function ln(s: string):  Uint8Array { return enc.encode(s + '\n'); }

// ── Column / string helpers ────────────────────────────────────────────────────

/**
 * Printer column width of a string.
 * Counts each Unicode code point as 1 column — matches how TIS-620 / UTF-8
 * thermal printers advance the cursor (1 char = 1 font-A character position).
 */
function cw(s: string): number { return [...s].length; }

/** Pad right to exactly `w` columns (truncates on overflow). */
function padR(s: string, w: number): string {
  const n = cw(s);
  if (n >= w) return [...s].slice(0, w).join('');
  return s + ' '.repeat(w - n);
}

/** Pad left to exactly `w` columns (truncates on overflow). */
function padL(s: string, w: number): string {
  const n = cw(s);
  if (n >= w) return [...s].slice(-w).join('');
  return ' '.repeat(w - n) + s;
}

/**
 * Two-column row: `left` left-aligned, `right` right-aligned, total `width` chars.
 * If left is too long it is truncated with "…" to make room for right.
 */
export function formatTwoColumns(left: string, right: string, width = COLS): string {
  const rw    = cw(right);
  const avail = width - rw;
  const lw    = cw(left);
  if (lw >= avail) return [...left].slice(0, avail - 1).join('') + '…' + right;
  return left + ' '.repeat(avail - lw) + right;
}

// Item row column widths (must sum to COLS = 48)
const QTY_W   = 4;   // "1x  "
const PRICE_W = 10;  // "  1,234.00"
const NAME_W  = COLS - QTY_W - PRICE_W; // = 34

/**
 * Single item row: qty (4 cols) | name (34 cols) | price (10 cols, right-aligned).
 * Wraps name onto continuation lines (indented, no price column) when > 34 chars.
 */
export function formatItemRow(qty: string, name: string, price: string): string {
  const q = padR(qty, QTY_W);
  const p = padL(price, PRICE_W);

  const nameChars = [...name];
  if (nameChars.length <= NAME_W) {
    return q + padR(name, NAME_W) + p;
  }

  const indent  = ' '.repeat(QTY_W);
  const rows: string[] = [];
  let   rest    = name;

  while (cw(rest) > 0) {
    const chunk  = [...rest].slice(0, NAME_W);
    const isFirst = rows.length === 0;
    rows.push(isFirst
      ? q + chunk.join('') + p                          // first line: qty + name + price
      : indent + padR(chunk.join(''), NAME_W + PRICE_W) // continuation: indented only
    );
    rest = [...rest].slice(NAME_W).join('');
  }
  return rows.join('\n');
}

/**
 * Add-on / option row.
 * "  + optionName                               +15.00"
 */
export function formatOptionRow(optionName: string, optionPrice?: string): string {
  const prefix = '  + ';
  if (!optionPrice || optionPrice === '' || optionPrice === '+0.00') {
    return prefix + optionName;
  }
  return formatTwoColumns(prefix + optionName, optionPrice);
}

// ── Backward-compatible exports ───────────────────────────────────────────────
export function formatLine(l: string, r: string, w = COLS): string {
  return formatTwoColumns(l, r, w);
}
export function centerLine(text: string, width = COLS): string {
  const pad = Math.max(0, Math.floor((width - cw(text)) / 2));
  return ' '.repeat(pad) + text;
}
export function dividerLine(char = '-', width = COLS): string {
  return char.repeat(width);
}

// ── Price formatter ───────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Receipt builder (text mode) ───────────────────────────────────────────────
function buildTextReceipt(r: PrintReceipt): Uint8Array {
  // Split dateTime into date / time parts for two-column meta row
  const dtStr   = r.dateTime.replace('T', ' ');
  const dtSpace = dtStr.indexOf(' ');
  const datePart = dtSpace > 0 ? dtStr.slice(0, dtSpace) : dtStr;
  const timePart = dtSpace > 0 ? dtStr.slice(dtSpace + 1, dtSpace + 6) : '';

  const orderType = r.source === 'DELIVERY' ? 'Delivery'
                  : r.tableName             ? 'กินที่ร้าน'
                  :                           'Take Away';

  const p: Uint8Array[] = [];

  // ─── Init ────────────────────────────────────────────────────────────────────
  p.push(INIT, AC, NL);

  // ─── Zone 1: Header ──────────────────────────────────────────────────────────
  p.push(SZ_DHDW);                         // bold + double-width + double-height
  p.push(ln(r.branchName));
  p.push(SZ_NOR);                          // reset size

  p.push(NL);
  p.push(BON, ln('ใบเสร็จรับเงิน / Receipt'), BOFF);
  p.push(NL);

  // ─── Zone 2: Order meta ──────────────────────────────────────────────────────
  p.push(AL);                              // left-align for all data rows
  p.push(tx(DIV));
  p.push(ln(formatTwoColumns(`ออเดอร์: #${r.orderNumber}`, `โต๊ะ: ${r.tableName ?? 'Take Away'}`)));
  if (r.staffName) {
    p.push(ln(formatTwoColumns(`พนักงาน: ${r.staffName}`, `ประเภท: ${orderType}`)));
  }
  p.push(ln(formatTwoColumns(`วันที่: ${datePart}`, `เวลา: ${timePart}`)));
  p.push(tx(DIV));

  // ─── Zone 3: Items ───────────────────────────────────────────────────────────
  p.push(NL);
  for (const item of r.items) {
    const rowPrice = fmt(item.qty * item.unitPrice);
    p.push(ln(formatItemRow(`${item.qty}x`, item.name, rowPrice)));

    item.options?.forEach(o => {
      const op = o.price > 0 ? `+${fmt(o.price)}` : '';
      p.push(ln(formatOptionRow(o.name, op)));
    });

    if (item.notes) p.push(ln(`   ※ ${item.notes}`));
  }

  // ─── Zone 4: Totals & payment ────────────────────────────────────────────────
  p.push(NL);
  p.push(tx(DIV));
  p.push(ln(formatTwoColumns(`จำนวนรายการ: ${r.items.length}`, `Subtotal: ${fmt(r.subtotal)}`)));

  if (r.discountAmount && r.discountAmount > 0) {
    const label = r.promoName ? `ส่วนลด (${r.promoName})` : 'ส่วนลด';
    p.push(ln(formatTwoColumns(label, `-${fmt(r.discountAmount)}`)));
  }

  p.push(tx(DDIV));
  p.push(BON, ln(formatTwoColumns('ยอดรวมสุทธิ / Total', fmt(r.finalTotal))), BOFF);
  p.push(tx(DDIV));

  const payLabel = r.paymentType === 'CASH' ? 'เงินสด' : 'สแกน QR / โอนเงิน';
  p.push(ln(formatTwoColumns('ชำระด้วย:', payLabel)));
  if (r.paymentType === 'CASH' && r.receivedAmount != null) {
    p.push(ln(formatTwoColumns('รับเงิน:', fmt(r.receivedAmount))));
    p.push(ln(formatTwoColumns('เงินทอน:', fmt(r.changeAmount ?? 0))));
  }
  p.push(tx(DIV));

  // ─── Zone 5: Footer ──────────────────────────────────────────────────────────
  p.push(AC, NL);

  if (r.memberName) {
    p.push(ln(`สมาชิก: ${r.memberName}`));
    p.push(ln('สะสมแต้มเรียบร้อย ✓'));
    p.push(tx(DIV));
    p.push(NL);
  }

  p.push(BON, ln('ขอบคุณที่ใช้บริการ / Thank You!'), BOFF);
  p.push(ln('Powered by ChabaPOS'));
  p.push(NL, NL, NL);
  p.push(FEED, CUT);

  return join(p);
}

// ── Canvas raster (QR slip only — keeps Thai font rendering for graphics) ─────
const THAI_F = '"Sarabun","Noto Sans Thai","TH Sarabun New",sans-serif';

function canvasToEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const W = canvas.width;
  const H = canvas.height;
  const bpr = Math.ceil(W / 8); // bytes per raster row
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, W, H);

  const HDR = [
    0x1B, 0x40, 0x1B, 0x61, 0x00,
    0x1D, 0x76, 0x30, 0x00,
    bpr & 0xFF, (bpr >> 8) & 0xFF,
    H   & 0xFF, (H   >> 8) & 0xFF,
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
  const W       = paperMm === 80 ? 576 : 384;
  const QR_SIZE = Math.min(W - 64, 256);

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qrUrl, {
    width:  QR_SIZE,
    margin: 2,
    color:  { dark: '#000000', light: '#ffffff' },
  });

  const PAD_TOP = 18;
  const NAME_H  = 70;
  const SEP_H   = 18;
  const BADGE_H = 58;
  const GAP_H   = 18;
  const QR_H    = qrCanvas.height;
  const GAP2_H  = 18;
  const SCAN_H  = 40;
  const POWER_H = 28;
  const FEED_H  = 52;
  const totalH  = PAD_TOP + NAME_H + SEP_H + BADGE_H + GAP_H + QR_H + GAP2_H + SCAN_H + POWER_H + FEED_H;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, totalH);

  let y = PAD_TOP;

  // Branch name
  ctx.fillStyle = '#000000';
  ctx.font = `bold 46px ${THAI_F}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(branchName, W / 2, y);
  y += NAME_H;

  // Dashed separator
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(W - 12, y); ctx.stroke();
  ctx.setLineDash([]);
  y += SEP_H;

  // Table badge
  const bW = Math.min(W - 40, 340);
  const bX = (W - bW) / 2;
  ctx.fillStyle = '#000000'; ctx.fillRect(bX, y, bW, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 30px ${THAI_F}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`TABLE: ${tableName}`, W / 2, y + 22);
  y += BADGE_H;

  // QR code
  ctx.drawImage(qrCanvas, (W - qrCanvas.width) / 2, y);
  y += QR_H + GAP2_H;

  // SCAN TO ORDER
  ctx.fillStyle = '#000000';
  ctx.font = `bold 26px ${THAI_F}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('SCAN TO ORDER', W / 2, y);
  y += SCAN_H;

  // Powered by
  ctx.fillStyle = '#555555';
  ctx.font = `17px ${THAI_F}`;
  ctx.fillText('Powered by ChabaPOS', W / 2, y);

  return canvasToEscPos(canvas);
}

// ── Public API ────────────────────────────────────────────────────────────────
export function buildOrderReceipt(receipt: PrintReceipt): Uint8Array {
  return buildTextReceipt(receipt);
}
