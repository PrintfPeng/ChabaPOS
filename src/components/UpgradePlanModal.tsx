import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';

interface Props {
  open: boolean;
  featureName: string;
  onClose: () => void;
}

export function UpgradePlanModal({ open, featureName, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-violet-600" />
          </div>
          <DialogTitle className="text-center text-lg">ฟีเจอร์นี้ต้องการแพ็กเกจสูงกว่า</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 text-center px-2">
          <span className="font-semibold text-slate-700">{featureName}</span>
          {' '}ไม่รวมอยู่ในแพ็กเกจปัจจุบัน
          อัปเกรดแพ็กเกจเพื่อปลดล็อคฟีเจอร์นี้และฟีเจอร์อื่น ๆ
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col mt-1">
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
            onClick={() => { onClose(); navigate('/pricing'); }}
          >
            <Zap className="w-4 h-4" />
            ดูแพ็กเกจทั้งหมด
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
