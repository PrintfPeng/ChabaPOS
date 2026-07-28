// Web Bluetooth printer driver — speed-optimised for bitmap receipts
//
// PERFORMANCE DESIGN:
//   writeWithoutResponse  — no GATT ACK round-trip (~8ms/chunk vs ~65ms/chunk)
//   Large chunk (512 B)   — fewer write operations; adaptive fallback to 182 B
//   Delay ONLY for noResp — writeWithResponse is self-paced by the GATT ACK;
//                           adding a setTimeout on top of ACK was the main bottleneck

// BLE service/characteristic UUID profiles (tried in order until one connects)
const PROFILES = [
  // Y58BT / most common Chinese BLE thermal printers
  { svc: '000018f0-0000-1000-8000-00805f9b34fb', chr: '00002af1-0000-1000-8000-00805f9b34fb' },
  // Generic 0xFF00 profile
  { svc: '0000ff00-0000-1000-8000-00805f9b34fb', chr: '0000ff02-0000-1000-8000-00805f9b34fb' },
  // Nordic UART Service (NUS)
  { svc: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', chr: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' },
  // SPP over BLE (Epson-compatible)
  { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', chr: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
];

// Large chunk → fewer write ops → faster transfer
// If the printer's ATT_MTU is smaller, the first oversized write will throw and
// we automatically retry the same offset with the safe fallback size.
const CHUNK_LARGE = 512;   // preferred (BLE 4.2+ negotiated MTU)
const CHUNK_SAFE  = 182;   // fallback  (safe for all BLE devices)

// Small inter-chunk delay for writeWithoutResponse only.
// Without ACK, cheap printer BLE buffers can overflow if we send back-to-back.
// writeWithResponse has NO added delay — GATT ACK (~50-80ms) is the natural throttle.
const DELAY_WO_RESP_MS = 8;

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing';

export class BluetoothPrinter {
  private device: BluetoothDevice                      | null = null;
  private char:   BluetoothRemoteGATTCharacteristic    | null = null;

  onStatusChange?: (s: PrinterStatus, name: string | null) => void;

  get isConnected() { return !!this.device?.gatt?.connected && !!this.char; }
  get deviceName()  { return this.device?.name ?? null; }

  // ── Connect ───────────────────────────────────────────────────────────────────
  async connect(): Promise<void> {
    this.emit('connecting');

    // Silent reconnect to a previously paired device (Chrome 85+)
    if ('getDevices' in navigator.bluetooth) {
      const prev = await (navigator.bluetooth as any).getDevices() as BluetoothDevice[];
      for (const dev of prev) {
        try { await this._attach(dev); this.emit('connected'); return; } catch { /* try next */ }
      }
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PROFILES.map(p => p.svc),
    });
    await this._attach(device);
    this.emit('connected');
  }

  private async _attach(device: BluetoothDevice): Promise<void> {
    const server = await device.gatt!.connect();
    for (const { svc, chr } of PROFILES) {
      try {
        const service = await server.getPrimaryService(svc);
        const char    = await service.getCharacteristic(chr);
        this.device   = device;
        this.char     = char;
        device.addEventListener('gattserverdisconnected', () => {
          this.char = null;
          this.emit('disconnected');
        });
        return;
      } catch { /* try next profile */ }
    }
    server.disconnect();
    throw new Error('ไม่พบ service ที่รองรับบน printer นี้\nลองเลือก printer อีกครั้ง หรือตรวจสอบ UUID ของรุ่นนั้น ๆ');
  }

  // ── Print ─────────────────────────────────────────────────────────────────────
  async print(data: Uint8Array): Promise<void> {
    if (!this.char) throw new Error('Printer ไม่ได้เชื่อมต่อ');
    this.emit('printing');

    // Prefer writeWithoutResponse: eliminates GATT ACK round-trip per chunk.
    // On a 67 KB bitmap with 512 B chunks:
    //   writeWithoutResponse + 8ms  → ~131 chunks × ~12ms  ≈ 1.6 s  ✓
    //   writeWithResponse    + 0ms  → ~131 chunks × ~65ms  ≈ 8.5 s
    //   writeWithResponse    + 30ms → ~131 chunks × ~95ms  ≈ 12.5 s  ✗ (old code)
    const useNoResp = this.char.properties.writeWithoutResponse;
    const write = useNoResp
      ? (b: Uint8Array) => this.char!.writeValueWithoutResponse(b)
      : (b: Uint8Array) => this.char!.writeValueWithResponse(b);

    let chunkSize = CHUNK_LARGE;
    let off       = 0;

    while (off < data.length) {
      const end   = Math.min(off + chunkSize, data.length);
      const chunk = data.slice(off, end);

      try {
        await write(chunk);

        // Delay only when there is no ACK to throttle the writes naturally.
        if (useNoResp) await sleep(DELAY_WO_RESP_MS);

        off = end; // advance only after a successful write
      } catch {
        if (chunkSize > CHUNK_SAFE) {
          // Oversized for this printer's negotiated MTU — shrink and retry same position
          chunkSize = CHUNK_SAFE;
        } else {
          throw new Error('ส่งข้อมูลไปยัง printer ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ');
        }
      }
    }

    this.emit('connected');
  }

  // ── Disconnect ────────────────────────────────────────────────────────────────
  disconnect(): void {
    this.device?.gatt?.disconnect();
    this.device = null;
    this.char   = null;
    this.emit('disconnected');
  }

  private emit(s: PrinterStatus) {
    this.onStatusChange?.(s, this.device?.name ?? null);
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
