// Web Bluetooth printer driver — supports common 58mm BLE thermal printers (Y58BT etc.)

// BLE service/characteristic UUID profiles for common 58mm thermal printers.
// We try them in order until one works.
const PROFILES = [
  // Y58BT / most common Chinese 58mm BLE printers
  { svc: '000018f0-0000-1000-8000-00805f9b34fb', chr: '00002af1-0000-1000-8000-00805f9b34fb' },
  // Generic 0xFF00 profile
  { svc: '0000ff00-0000-1000-8000-00805f9b34fb', chr: '0000ff02-0000-1000-8000-00805f9b34fb' },
  // Nordic UART Service (NUS)
  { svc: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', chr: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' },
  // SPP over BLE (some Epson-compatible printers)
  { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', chr: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
];

// Conservative chunk size — BLE minimum ATT_MTU is 23 bytes (3 overhead = 20 payload)
// Most stacks negotiate higher, but 182 bytes is safe for nearly all devices.
const CHUNK = 182;

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing';

export class BluetoothPrinter {
  private device:  BluetoothDevice                        | null = null;
  private char:    BluetoothRemoteGATTCharacteristic      | null = null;

  onStatusChange?: (s: PrinterStatus, name: string | null) => void;

  get isConnected() {
    return !!this.device?.gatt?.connected && !!this.char;
  }

  get deviceName() {
    return this.device?.name ?? null;
  }

  // ── Connect ──────────────────────────────────
  async connect(): Promise<void> {
    this.emit('connecting');

    // Try to silently reconnect to a previously approved device (Chrome 85+)
    if ('getDevices' in navigator.bluetooth) {
      const prev = await (navigator.bluetooth as any).getDevices() as BluetoothDevice[];
      for (const dev of prev) {
        try {
          await this._attach(dev);
          this.emit('connected');
          return;
        } catch { /* try next */ }
      }
    }

    // Show Bluetooth device picker — user selects the printer
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
        this.device = device;
        this.char   = char;

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

  // ── Print ─────────────────────────────────────
  async print(data: Uint8Array): Promise<void> {
    if (!this.char) throw new Error('Printer ไม่ได้เชื่อมต่อ');
    this.emit('printing');

    const withResponse = this.char.properties.write;

    for (let off = 0; off < data.length; off += CHUNK) {
      const chunk = data.slice(off, Math.min(off + CHUNK, data.length));
      if (withResponse) {
        await this.char.writeValueWithResponse(chunk);
      } else {
        await this.char.writeValueWithoutResponse(chunk);
      }
      // Small delay to prevent BLE buffer overflow on cheap printers
      await new Promise(r => setTimeout(r, 30));
    }

    this.emit('connected');
  }

  // ── Disconnect ───────────────────────────────
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
