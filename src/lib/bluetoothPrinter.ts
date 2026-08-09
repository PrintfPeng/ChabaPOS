// Web Bluetooth printer driver — reliability-first for bitmap receipts
//
// RELIABILITY DESIGN:
//   writeWithResponse (GATT ACK) is now the PREFERRED path. Cheap thermal
//   printers have no real flow control beyond the BLE link itself — with
//   writeWithoutResponse, the browser only confirms the local stack accepted
//   the chunk, not that the printer's tiny receive buffer had room for it.
//   Once that buffer overflows mid-raster-image, the printer's firmware falls
//   out of "receiving GS v 0 bitmap data" mode and starts interpreting the
//   leftover bytes as ESC/POS TEXT commands — that IS the garbled ASCII spew
//   symptom. writeValueWithResponse waits for the peripheral's own ACK before
//   the next chunk is sent, which naturally paces the transfer to whatever
//   speed that specific printer can actually keep up with — no delay tuning
//   can substitute for that real backpressure.
//   writeWithoutResponse is kept only as a fallback for characteristics that
//   don't support "write" at all, with an added delay to reduce (not
//   eliminate) the same overflow risk.

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

// Inter-chunk delay for the writeWithoutResponse FALLBACK path only (used when
// the characteristic doesn't support "write" with response at all). Without an
// ACK, cheap printer BLE buffers can overflow if chunks are sent back-to-back.
// writeWithResponse has NO added delay — the GATT ACK (~50-80ms) already paces it.
const DELAY_WO_RESP_MS = 20;

// Delay after a job's last byte before the NEXT queued job is allowed to start.
// Cheap thermal printers keep processing their internal print buffer for a
// moment after the last BLE write resolves — starting the next job's bytes
// too soon overruns that buffer and produces garbled ASCII output.
const JOB_SETTLE_MS = 700;

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing';

export class BluetoothPrinter {
  private device: BluetoothDevice                      | null = null;
  private char:   BluetoothRemoteGATTCharacteristic    | null = null;

  // Mutex chain — every print() call appends itself here so jobs run strictly
  // one at a time. Without this, two calls fired back-to-back (e.g. a receipt
  // immediately followed by a kitchen slip, or a cashier submitting a second
  // order before the first one's print finished) would interleave their byte
  // writes on the same GATT characteristic, producing garbled printer output.
  private printQueue: Promise<void> = Promise.resolve();

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

  // ── Print (queued) ───────────────────────────────────────────────────────────
  // Public entry point — appends this job to the mutex chain instead of writing
  // immediately, so concurrent callers are serialized rather than interleaved.
  print(data: Uint8Array): Promise<void> {
    const job = this.printQueue.then(() => this._printNow(data));
    // The chain itself must never reject, or every job queued after a failed
    // one would fail too. Each caller still gets their own job's rejection
    // via the returned `job` promise.
    this.printQueue = job.catch(() => {});
    return job;
  }

  private async _printNow(data: Uint8Array): Promise<void> {
    if (!this.char) throw new Error('Printer ไม่ได้เชื่อมต่อ');
    this.emit('printing');

    // Prefer writeWithResponse: the GATT ACK is real backpressure from the
    // printer's own BLE stack, so the transfer paces itself to whatever that
    // specific device can actually absorb — this is what prevents buffer
    // overflow / garbled output, at the cost of a slower transfer.
    // On a 67 KB bitmap with 512 B chunks:
    //   writeWithResponse    (ACK-paced) → ~131 chunks × ~65ms ≈ 8.5 s  ✓ reliable
    //   writeWithoutResponse + 20ms      → ~131 chunks × ~24ms ≈ 3.1 s  fallback only
    const canRespond = this.char.properties.write;
    const useNoResp  = !canRespond && this.char.properties.writeWithoutResponse;
    const write = canRespond
      ? (b: Uint8Array) => this.char!.writeValueWithResponse(b)
      : (b: Uint8Array) => this.char!.writeValueWithoutResponse(b);

    // writeWithoutResponse is a single unacknowledged ATT packet — a chunk
    // larger than the negotiated MTU can be silently truncated/corrupted with
    // no JS exception to catch, unlike writeWithResponse's queued long-write
    // procedure which handles oversized values correctly regardless of MTU.
    // Start conservative when there's no ACK to fall back on detecting this.
    let chunkSize = useNoResp ? CHUNK_SAFE : CHUNK_LARGE;
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

    // Let the printer's own buffer settle before the next queued job (if any)
    // starts sending — this is what the "printing" status covers.
    await sleep(JOB_SETTLE_MS);

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
