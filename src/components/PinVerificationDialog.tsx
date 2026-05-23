import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useParams } from 'react-router-dom';

interface PinVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PinVerificationDialog({
  isOpen,
  onClose,
  onSuccess,
  title = 'ยืนยันรหัสความปลอดภัย',
  description = 'กรุณากรอกรหัส PIN 6 หลักของสาขานี้ เพื่อดำเนินการต่อ',
}: PinVerificationDialogProps) {
  const { branchId } = useParams<{ branchId: string }>();
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin || pin.length !== 6) {
      return toast.error('กรุณากรอกรหัส PIN ให้ครบ 6 หลัก');
    }
    
    if (!branchId) return toast.error('ไม่พบข้อมูลสาขา');

    setIsVerifying(true);
    try {
      await api.post(`/branches/${branchId}/verify-pin`, { pin });
      setPin(''); // clear for next time
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'รหัส PIN ไม่ถูกต้อง');
      setPin(''); // clear on error to force re-entry
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setPin('');
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-6 py-4">
          <div className="space-y-2 flex flex-col items-center">
            <Label htmlFor="pin-input" className="sr-only">รหัส PIN</Label>
            <Input 
              id="pin-input"
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              className="text-center tracking-[0.5em] font-mono text-2xl w-48 h-14"
              autoFocus
            />
          </div>

          <DialogFooter className="sm:justify-between flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isVerifying} className="flex-1">
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isVerifying} className="flex-1">
              {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              ยืนยัน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
