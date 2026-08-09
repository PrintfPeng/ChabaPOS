import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { BluetoothPrinter, PrinterStatus } from '../lib/bluetoothPrinter';
import { buildOrderReceipt, buildTableQRSlip, PrintReceipt, buildShiftSummaryReceipt, ShiftSummaryReceipt, buildKitchenSlip, KitchenSlip, buildPurchaseOrderSlip, PurchaseOrderSlip } from '../lib/escpos';
import { toast } from 'sonner';

interface PrinterCtx {
  status:       PrinterStatus;
  /** True while a print job (or a queued one waiting its turn) is in flight.
   *  Derived from status === 'printing' — the driver's job queue guarantees
   *  only one job is ever active at a time, so this stays accurate even when
   *  printReceipt/printKitchenSlip/etc. are called back-to-back. */
  isPrinting:   boolean;
  deviceName:   string | null;
  isSupported:  boolean;
  connect:      () => Promise<void>;
  disconnect:   () => void;
  printReceipt:      (receipt: PrintReceipt) => Promise<void>;
  printKitchenSlip:  (slip: KitchenSlip) => Promise<void>;
  printShiftSummary: (receipt: ShiftSummaryReceipt) => Promise<void>;
  printPurchaseOrder: (po: PurchaseOrderSlip) => Promise<void>;
  /** Print a table QR Code slip. Pass silent=true to suppress per-table toasts (bulk printing). */
  printTableQR: (qrDataUrl: string, tableName: string, branchName: string, silent?: boolean) => Promise<void>;
}

const Ctx = createContext<PrinterCtx | null>(null);

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const printerRef                      = useRef(new BluetoothPrinter());
  const [status,     setStatus]         = useState<PrinterStatus>('disconnected');
  const [deviceName, setDeviceName]     = useState<string | null>(null);
  const isSupported                     = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const isPrinting                      = status === 'printing';

  useEffect(() => {
    printerRef.current.onStatusChange = (s, name) => {
      setStatus(s);
      setDeviceName(name);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!isSupported) {
      toast.error('เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth — ใช้ Chrome หรือ Edge');
      return;
    }
    try {
      await printerRef.current.connect();
      toast.success(`เชื่อมต่อ "${printerRef.current.deviceName}" สำเร็จ`);
    } catch (e: any) {
      // User cancelled picker — NotFoundError — don't show error toast
      if (e?.name !== 'NotFoundError') {
        toast.error(e?.message ?? 'เชื่อมต่อ Bluetooth ไม่สำเร็จ');
      }
      setStatus('disconnected');
      setDeviceName(null);
    }
  }, [isSupported]);

  const disconnect = useCallback(() => {
    printerRef.current.disconnect();
  }, []);

  const printReceipt = useCallback(async (receipt: PrintReceipt) => {
    if (!printerRef.current.isConnected) {
      toast.warning('กรุณาเชื่อมต่อ printer ก่อน');
      return;
    }
    try {
      const data = buildOrderReceipt(receipt);
      await printerRef.current.print(data);
      toast.success('พิมพ์ใบเสร็จสำเร็จ');
    } catch (e: any) {
      toast.error(e?.message ?? 'พิมพ์ไม่สำเร็จ กรุณาลองใหม่');
      setStatus('disconnected');
      setDeviceName(null);
    }
  }, []);

  const printKitchenSlip = useCallback(async (slip: KitchenSlip) => {
    if (!printerRef.current.isConnected) {
      toast.warning('กรุณาเชื่อมต่อ printer ก่อน');
      return;
    }
    try {
      const data = buildKitchenSlip(slip);
      await printerRef.current.print(data);
    } catch (e: any) {
      toast.error(e?.message ?? 'พิมพ์ใบครัวไม่สำเร็จ');
      setStatus('disconnected');
      setDeviceName(null);
    }
  }, []);

  const printPurchaseOrder = useCallback(async (po: PurchaseOrderSlip) => {
    if (!printerRef.current.isConnected) {
      toast.error('กรุณาเชื่อมต่อเครื่องพิมพ์ก่อนพิมพ์ใบสั่งซื้อ');
      return;
    }
    try {
      const data = buildPurchaseOrderSlip(po);
      await printerRef.current.print(data);
      toast.success('ส่งคำสั่งพิมพ์ใบสั่งซื้อแล้ว');
    } catch (e: any) {
      toast.error(e?.message ?? 'พิมพ์ใบสั่งซื้อไม่สำเร็จ');
      setStatus('disconnected');
      setDeviceName(null);
    }
  }, []);

  const printShiftSummary = useCallback(async (receipt: ShiftSummaryReceipt) => {
    if (!printerRef.current.isConnected) {
      toast.warning('กรุณาเชื่อมต่อ printer ก่อน');
      return;
    }
    try {
      const data = buildShiftSummaryReceipt(receipt);
      await printerRef.current.print(data);
      toast.success('พิมพ์ใบสรุปยอดสำเร็จ');
    } catch (e: any) {
      toast.error(e?.message ?? 'พิมพ์ใบสรุปยอดไม่สำเร็จ กรุณาลองใหม่');
      setStatus('disconnected');
      setDeviceName(null);
    }
  }, []);

  const printTableQR = useCallback(async (
    qrDataUrl: string,
    tableName: string,
    branchName: string,
    silent = false,
  ) => {
    if (!printerRef.current.isConnected) {
      if (!silent) toast.warning('กรุณาเชื่อมต่อ printer ก่อน');
      throw new Error('Printer not connected');
    }
    try {
      const data = await buildTableQRSlip(qrDataUrl, tableName, branchName);
      await printerRef.current.print(data);
      if (!silent) toast.success(`พิมพ์ QR Code โต๊ะ ${tableName} สำเร็จ`);
    } catch (e: any) {
      if (!silent) toast.error(e?.message ?? 'พิมพ์ QR Code ไม่สำเร็จ');
      setStatus('disconnected');
      setDeviceName(null);
      throw e;
    }
  }, []);

  return (
    <Ctx.Provider value={{ status, isPrinting, deviceName, isSupported, connect, disconnect, printReceipt, printKitchenSlip, printShiftSummary, printTableQR, printPurchaseOrder }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePrinter(): PrinterCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrinter must be inside <PrinterProvider>');
  return ctx;
}

export type { PrintReceipt, ShiftSummaryReceipt, KitchenSlip, PurchaseOrderSlip };
