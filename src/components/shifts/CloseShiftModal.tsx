import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Banknote, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useShift, Shift } from '../../contexts/ShiftContext';
import { usePrinter } from '../../context/PrinterContext';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  branchId: string;
  shift: Shift;
  onClose: () => void;
}

export function CloseShiftModal({ open, branchId, shift, onClose }: Props) {
  const { closeShift } = useShift();
  const { printShiftSummary } = usePrinter();
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cashSales, setCashSales] = useState<number | null>(null);
  const [loadingSales, setLoadingSales] = useState(false);

  // โหลดยอดขายเงินสดของกะนี้
  useEffect(() => {
    if (!open) return;
    setLoadingSales(true);
    api.get(`/branches/${branchId}/shifts/current`)
      .then(() => {
        // ใช้ข้อมูลจาก shift และดึงยอดขายเงินสดเพิ่มเติม
        api.get(`/orders?branchId=${branchId}`)
          .then(res => {
            const orders: any[] = res.data ?? [];
            const shiftCash = orders
              .filter((o: any) => o.shiftId === shift.id && o.paymentType === 'CASH' && o.status === 'PAID')
              .reduce((sum: number, o: any) => sum + o.totalAmount - (o.discountAmount ?? 0), 0);
            setCashSales(shiftCash);
          })
          .catch(() => setCashSales(null))
          .finally(() => setLoadingSales(false));
      })
      .catch(() => setLoadingSales(false));
  }, [open, branchId, shift.id]);

  const expectedCash = cashSales !== null ? shift.startingCash + cashSales : null;
  const actual = parseFloat(actualCash) || 0;
  const diff = expectedCash !== null ? actual - expectedCash : null;

  const handleSubmit = async () => {
    const amount = parseFloat(actualCash);
    if (isNaN(amount) || amount < 0) {
      return toast.error('กรุณากรอกยอดเงินที่นับได้ให้ถูกต้อง');
    }
    setIsSubmitting(true);
    try {
      await closeShift(branchId, amount, notes || undefined);
      toast.success('ปิดกะสำเร็จ — สรุปยอดประจำวันบันทึกแล้ว');

      try {
        const res = await api.get(`/branches/${branchId}/shifts/${shift.id}/summary`);
        await printShiftSummary(res.data);
      } catch (printErr) {
        toast.error('ไม่สามารถพิมพ์ใบสรุปยอดได้');
        console.error('Print shift summary error:', printErr);
      }

      setActualCash('');
      setNotes('');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'ปิดกะไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openedAt = new Date(shift.openedAt).toLocaleString('th-TH', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">🔴</span> ปิดกะ / ปิดร้าน
          </DialogTitle>
          <DialogDescription>
            เปิดกะเมื่อ {openedAt} — ตรวจนับเงินและกรอกยอดที่นับได้จริง
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* สรุปตัวเลข */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm">
            <Row label="เงินทอนเริ่มต้น" value={shift.startingCash} />
            <Row
              label="ยอดขายเงินสด (กะนี้)"
              value={cashSales}
              loading={loadingSales}
            />
            <div className="border-t border-slate-200 pt-2 mt-2">
              <Row
                label="ยอดที่ควรมีในลิ้นชัก"
                value={expectedCash}
                loading={loadingSales}
                bold
              />
            </div>
          </div>

          {/* Input ยอดจริง */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />
              ยอดเงินที่นับได้จริง (บาท)
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="กรอกยอดที่นับได้จริง"
              value={actualCash}
              onChange={e => setActualCash(e.target.value)}
              className="text-lg h-12 font-semibold"
              autoFocus
            />
          </div>

          {/* ผลต่าง */}
          {actualCash && diff !== null && (
            <div className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
              diff === 0 && 'bg-green-50 text-green-700',
              diff > 0  && 'bg-blue-50 text-blue-700',
              diff < 0  && 'bg-red-50 text-red-700',
            )}>
              {diff === 0 && <Minus className="w-4 h-4" />}
              {diff > 0  && <TrendingUp className="w-4 h-4" />}
              {diff < 0  && <TrendingDown className="w-4 h-4" />}
              {diff === 0
                ? 'ยอดตรง — ไม่มีผลต่าง'
                : diff > 0
                ? `เงินเกิน ฿${diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : `เงินขาด ฿${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </div>
          )}

          {/* หมายเหตุ */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">หมายเหตุ (ถ้ามี)</label>
            <textarea
              rows={2}
              placeholder="บันทึกเพิ่มเติม เช่น เงินขาดเพราะ..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !actualCash}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            ปิดกะ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label, value, loading, bold,
}: {
  label: string;
  value: number | null;
  loading?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={cn('flex justify-between', bold && 'font-bold text-slate-800')}>
      <span className="text-slate-500">{label}</span>
      <span>
        {loading
          ? '...'
          : value !== null
          ? `฿${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          : '-'}
      </span>
    </div>
  );
}
