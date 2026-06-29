import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import { Loader2, Percent, BadgeDollarSign, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

type PromotionType = 'PERCENT' | 'FIXED' | 'POINTS_REDEMPTION';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: any | null;
  branchId: number;
  onSaved: () => void;
}

const TYPE_OPTIONS: { value: PromotionType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'PERCENT',
    label: 'ลด %',
    desc: 'ส่วนลดเป็นเปอร์เซ็นต์ เช่น ลด 10%',
    icon: <Percent className="w-5 h-5" />,
  },
  {
    value: 'FIXED',
    label: 'ลดเงิน',
    desc: 'ส่วนลดเป็นจำนวนบาท เช่น ลด ฿50',
    icon: <BadgeDollarSign className="w-5 h-5" />,
  },
  {
    value: 'POINTS_REDEMPTION',
    label: 'แลกแต้ม',
    desc: 'ลูกค้าใช้แต้มแลกส่วนลด',
    icon: <Coins className="w-5 h-5" />,
  },
];

const EMPTY = {
  name:         '',
  code:         '',
  type:         'PERCENT' as PromotionType,
  value:        10,
  minSpend:     0,
  pointsNeeded: 0,
  memberOnly:   false,
  isActive:     true,
  startDate:    '',
  endDate:      '',
};

export default function PromotionBuilder({ open, onClose, editing, branchId, onSaved }: Props) {
  const [form, setForm]     = useState({ ...EMPTY });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        name:         editing.name         ?? '',
        code:         editing.code         ?? '',
        type:         editing.type         ?? 'PERCENT',
        value:        editing.value        ?? 0,
        minSpend:     editing.minSpend     ?? 0,
        pointsNeeded: editing.pointsNeeded ?? 0,
        memberOnly:   editing.memberOnly   ?? false,
        isActive:     editing.isActive     ?? true,
        startDate:    editing.startDate    ? editing.startDate.substring(0, 10) : '',
        endDate:      editing.endDate      ? editing.endDate.substring(0, 10)   : '',
      });
    } else {
      setForm({ ...EMPTY });
    }
  }, [editing, open]);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('กรุณากรอกชื่อโปรโมชั่น');
    if (form.value <= 0) return toast.error('กรุณากรอกมูลค่าส่วนลด');
    if (form.type === 'PERCENT' && form.value > 100)
      return toast.error('ส่วนลดแบบ % ต้องไม่เกิน 100');

    setIsSaving(true);
    const payload = {
      ...form,
      branchId,
      code:      form.code.trim() || undefined,
      startDate: form.startDate || undefined,
      endDate:   form.endDate   || undefined,
    };

    try {
      if (editing) {
        await api.patch(`/promotions/${editing.id}`, payload);
        toast.success('แก้ไขโปรโมชั่นสำเร็จ');
      } else {
        await api.post('/promotions', payload);
        toast.success(`สร้างโปรโมชั่น "${form.name}" สำเร็จ`);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* ชื่อ */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-600">ชื่อโปรโมชั่น *</label>
            <Input
              placeholder="เช่น ลด 10% ต้อนรับเดือนใหม่"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          {/* รหัสโปรโมชั่น */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-600">รหัสโปรโมชั่น (ไม่บังคับ)</label>
            <Input
              placeholder="เช่น SAVE10, MEMBER20"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              className="h-10 rounded-xl font-mono"
            />
          </div>

          {/* ประเภทส่วนลด */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">ประเภทส่วนลด *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set('type', t.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all',
                    form.type === t.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-100 text-slate-500 hover:border-slate-200',
                  )}
                >
                  {t.icon}
                  <span className="text-xs font-bold leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {TYPE_OPTIONS.find((t) => t.value === form.type)?.desc}
            </p>
          </div>

          {/* มูลค่า */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">
                {form.type === 'PERCENT' ? 'ส่วนลด (%)' : 'ส่วนลด (บาท)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  {form.type === 'PERCENT' ? '%' : '฿'}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={form.type === 'PERCENT' ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => set('value', Number(e.target.value))}
                  className="pl-7 h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">ยอดซื้อขั้นต่ำ (บาท)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">฿</span>
                <Input
                  type="number"
                  min={0}
                  value={form.minSpend}
                  onChange={(e) => set('minSpend', Number(e.target.value))}
                  className="pl-7 h-10 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* แต้มที่ต้องการ (POINTS_REDEMPTION เท่านั้น) */}
          {form.type === 'POINTS_REDEMPTION' && (
            <div className="space-y-1.5 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <label className="text-sm font-bold text-amber-700">แต้มที่ต้องใช้แลก *</label>
              <div className="relative">
                <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                <Input
                  type="number"
                  min={1}
                  value={form.pointsNeeded}
                  onChange={(e) => set('pointsNeeded', Number(e.target.value))}
                  className="pl-9 h-10 rounded-xl border-amber-200 bg-white"
                />
              </div>
              <p className="text-xs text-amber-600">
                ลูกค้าใช้ {form.pointsNeeded} แต้ม → ลด ฿{form.value}
              </p>
            </div>
          )}

          {/* ช่วงเวลา */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">วันเริ่มต้น</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">วันสิ้นสุด</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            {([
              { key: 'memberOnly' as const, label: 'สำหรับสมาชิกเท่านั้น', desc: 'ต้องค้นหาสมาชิกก่อนจึงใช้ได้' },
              { key: 'isActive'   as const, label: 'เปิดใช้งานโปรโมชั่น',  desc: 'ปิดเพื่อซ่อนจาก cashier หน้าชำระเงิน' },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => set(key, !form[key])}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
                    form[key] ? 'bg-primary' : 'bg-slate-200',
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                    form[key] ? 'translate-x-6' : 'translate-x-1',
                  )} />
                </button>
              </div>
            ))}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-11 rounded-xl font-bold"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {editing ? 'บันทึกการแก้ไข' : 'สร้างโปรโมชั่น'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
