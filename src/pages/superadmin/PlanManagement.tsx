import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/api';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit2, Package, Check, X, Loader2,
  ToggleLeft, ToggleRight, AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { cn } from '../../lib/utils';
import { FEATURE_LABELS } from '../../lib/feature-config';
import type { FeatureKey } from '../../lib/feature-config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  id: number;
  name: string;
  price: number;
  description: string | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const planSchema = z.object({
  name:        z.string().min(1, 'กรุณาระบุชื่อแพ็กเกจ'),
  price:       z.number({ error: 'กรุณาระบุราคา' }).min(0, 'ราคาต้องไม่ต่ำกว่า 0'),
  description: z.string().optional(),
  features:    z.array(z.string()).min(1, 'กรุณาเลือกอย่างน้อย 1 ฟีเจอร์'),
  isActive:    z.boolean(),
  sortOrder:   z.number(),
});

type PlanFormData = z.infer<typeof planSchema>;

const DEFAULT_VALUES: PlanFormData = {
  name: '',
  price: 0,
  description: '',
  features: [],
  isActive: true,
  sortOrder: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACCENT = [
  'bg-slate-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-sky-600',
];

const ALL_FEATURE_ENTRIES = Object.entries(FEATURE_LABELS) as [FeatureKey, { name: string; description: string }][];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlanManagement() {
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [formOpen, setFormOpen]     = useState(false);
  const [editingPlan, setEditingPlan]   = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const selectedFeatures = watch('features');

  const toggleFeature = (key: FeatureKey, checked: boolean) => {
    const updated = checked
      ? [...selectedFeatures, key]
      : selectedFeatures.filter(k => k !== key);
    setValue('features', updated, { shouldValidate: true });
  };

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.get<Plan[]>('/plans');
      setPlans(res.data);
    } catch {
      toast.error('โหลดข้อมูลแพ็กเกจไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingPlan(null);
    reset(DEFAULT_VALUES);
    setFormOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    reset({
      name:        plan.name,
      price:       plan.price,
      description: plan.description ?? '',
      features:    plan.features,
      isActive:    plan.isActive,
      sortOrder:   plan.sortOrder,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingPlan(null);
    reset(DEFAULT_VALUES);
  };

  // ── Mutations ────────────────────────────────────────────────────────────

  const onSubmit = async (data: PlanFormData) => {
    setSaving(true);
    try {
      if (editingPlan) {
        await api.patch(`/plans/${editingPlan.id}`, data);
        toast.success('อัปเดตแพ็กเกจสำเร็จ');
      } else {
        await api.post('/plans', data);
        toast.success('สร้างแพ็กเกจสำเร็จ');
      }
      closeForm();
      fetchPlans();
    } catch {
      toast.error('บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan: Plan) => {
    try {
      await api.patch(`/plans/${plan.id}`, { isActive: !plan.isActive });
      toast.success(plan.isActive ? 'ปิดใช้งานแพ็กเกจแล้ว' : 'เปิดใช้งานแพ็กเกจแล้ว');
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
    } catch {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/plans/${deleteTarget.id}`);
      toast.success('ลบแพ็กเกจสำเร็จ');
      setDeleteTarget(null);
      setPlans(prev => prev.filter(p => p.id !== deleteTarget.id));
    } catch {
      toast.error('ลบแพ็กเกจไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const activePlans = plans.filter(p => p.isActive).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">จัดการแพ็กเกจ</h1>
          <p className="text-sm text-slate-400 mt-0.5">กำหนดแผนการสมัครสมาชิกสำหรับร้านค้า</p>
        </div>
        <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-700 text-white gap-2 self-start">
          <Plus className="w-4 h-4" />
          สร้างแพ็กเกจใหม่
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'แพ็กเกจทั้งหมด', value: plans.length,               color: 'text-slate-700' },
          { label: 'เปิดใช้งาน',      value: activePlans,                color: 'text-emerald-600' },
          { label: 'ปิดใช้งาน',       value: plans.length - activePlans, color: 'text-rose-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Plan cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          กำลังโหลด...
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
          <Package className="w-16 h-16" />
          <p className="text-lg font-black text-slate-400">ยังไม่มีแพ็กเกจ</p>
          <p className="text-sm text-slate-400">สร้างแพ็กเกจแรกเพื่อเริ่มต้น</p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            สร้างแพ็กเกจแรก
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <Card key={plan.id} className={cn('overflow-hidden border-slate-100', !plan.isActive && 'opacity-60')}>
              {/* Accent header */}
              <div className={cn('px-5 py-4 text-white', ACCENT[i % ACCENT.length])}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-lg leading-tight">{plan.name}</p>
                    {plan.description && (
                      <p className="text-xs opacity-80 mt-0.5 line-clamp-2">{plan.description}</p>
                    )}
                  </div>
                  <span className={cn(
                    'shrink-0 text-xs font-bold px-2 py-0.5 rounded-full',
                    plan.isActive ? 'bg-white/20' : 'bg-black/20',
                  )}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black">
                  ฿{plan.price.toLocaleString()}
                  <span className="text-sm font-semibold opacity-75">/เดือน</span>
                </p>
              </div>

              <CardContent className="px-5 py-4 space-y-4">
                {/* All 6 features: ✓ included / × excluded */}
                <div className="space-y-1">
                  {ALL_FEATURE_ENTRIES.map(([key, meta]) => {
                    const included = plan.features.includes(key);
                    return (
                      <div
                        key={key}
                        className={cn(
                          'flex items-center gap-2 text-xs',
                          included ? 'text-slate-700' : 'text-slate-300',
                        )}
                      >
                        {included
                          ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <X     className="w-3.5 h-3.5 shrink-0" />
                        }
                        <span className={included ? '' : 'line-through'}>{meta.name}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="ghost" size="sm"
                    className="flex-1 gap-1.5 text-slate-600"
                    onClick={() => openEdit(plan)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className={cn('flex-1 gap-1.5', plan.isActive ? 'text-amber-600' : 'text-emerald-600')}
                    onClick={() => handleToggle(plan)}
                  >
                    {plan.isActive
                      ? <ToggleRight className="w-3.5 h-3.5" />
                      : <ToggleLeft  className="w-3.5 h-3.5" />
                    }
                    {plan.isActive ? 'ปิด' : 'เปิด'}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="flex-1 gap-1.5 text-rose-500"
                    onClick={() => setDeleteTarget(plan)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'แก้ไขแพ็กเกจ' : 'สร้างแพ็กเกจใหม่'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="p-name">ชื่อแพ็กเกจ <span className="text-rose-500">*</span></Label>
              <Input id="p-name" placeholder="เช่น Starter, Pro, Enterprise" {...register('name')} />
              {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
            </div>

            {/* Price + Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">ราคา/เดือน (฿) <span className="text-rose-500">*</span></Label>
                <Input id="p-price" type="number" min="0" step="1" placeholder="0" {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-xs text-rose-500">{errors.price.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sort">ลำดับการแสดงผล</Label>
                <Input id="p-sort" type="number" min="0" step="1" placeholder="0" {...register('sortOrder', { valueAsNumber: true })} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">คำอธิบาย</Label>
              <textarea
                id="p-desc"
                rows={2}
                placeholder="อธิบายแพ็กเกจโดยย่อ..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                {...register('description')}
              />
            </div>

            {/* isActive */}
            <div className="flex items-center gap-3">
              <input id="p-active" type="checkbox" className="w-4 h-4 accent-violet-600" {...register('isActive')} />
              <Label htmlFor="p-active" className="cursor-pointer">เปิดใช้งานทันที</Label>
            </div>

            {/* Feature toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  ฟีเจอร์ระบบที่รวมในแพ็กเกจ <span className="text-rose-500">*</span>
                </Label>
                <span className="text-xs text-slate-400">
                  {selectedFeatures.length}/{ALL_FEATURE_ENTRIES.length} ฟีเจอร์
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {ALL_FEATURE_ENTRIES.map(([key, meta]) => {
                  const isOn = selectedFeatures.includes(key);
                  return (
                    <label
                      key={key}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none',
                        isOn ? 'bg-violet-50 hover:bg-violet-50/80' : 'bg-white hover:bg-slate-50',
                      )}
                    >
                      {/* Custom checkbox indicator */}
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                        isOn ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white',
                      )}>
                        {isOn && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isOn}
                        onChange={e => toggleFeature(key, e.target.checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold', isOn ? 'text-violet-700' : 'text-slate-700')}>
                          {meta.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{meta.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {(errors.features as { message?: string })?.message && (
                <p className="text-xs text-rose-500">
                  {(errors.features as { message?: string }).message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={closeForm}>ยกเลิก</Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPlan ? 'บันทึกการแก้ไข' : 'สร้างแพ็กเกจ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              ยืนยันการลบ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            คุณต้องการลบแพ็กเกจ <span className="font-bold">{deleteTarget?.name}</span> ใช่หรือไม่?
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 text-white gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              ลบแพ็กเกจ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
