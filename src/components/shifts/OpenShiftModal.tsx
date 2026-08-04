import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { useShift } from '../../contexts/ShiftContext';

interface Props {
  open: boolean;
  branchId: string;
  onClose: () => void;
}

export function OpenShiftModal({ open, branchId, onClose }: Props) {
  const { openShift } = useShift();
  const [startingCash, setStartingCash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amount = parseFloat(startingCash);
    if (isNaN(amount) || amount < 0) {
      return toast.error('กรุณากรอกจำนวนเงินทอนเริ่มต้นให้ถูกต้อง');
    }
    setIsSubmitting(true);
    try {
      await openShift(branchId, amount);
      toast.success(`เปิดกะสำเร็จ — เงินทอนเริ่มต้น ฿${amount.toLocaleString()}`);
      setStartingCash('');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'เปิดกะไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">🟢</span> เปิดกะ / เปิดร้าน
          </DialogTitle>
          <DialogDescription>
            กรอกจำนวนเงินทอนที่เตรียมไว้ในลิ้นชักก่อนเริ่มรับออเดอร์
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            เงินทอนเริ่มต้น (บาท)
          </label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="เช่น 500"
            value={startingCash}
            onChange={e => setStartingCash(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="text-lg h-12 font-semibold"
            autoFocus
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {[200, 500, 1000, 2000].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => setStartingCash(String(amt))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:border-primary hover:text-primary transition-colors"
              >
                ฿{amt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            เปิดร้านเลย
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
