import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  User, Package, Banknote, CheckCircle2, Upload, X,
  Loader2, Check, Eye, EyeOff, Copy,
} from 'lucide-react';
import api from '../lib/api';
import { uploadImageToSupabase } from '../lib/supabase-storage';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { FEATURE_LABELS } from '../lib/feature-config';
import type { FeatureKey } from '../lib/feature-config';

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  firstName:       z.string().min(1, 'กรุณาระบุชื่อ'),
  lastName:        z.string().min(1, 'กรุณาระบุนามสกุล'),
  shopName:        z.string().min(1, 'กรุณาระบุชื่อร้านค้า / แบรนด์'),
  phone:           z.string().optional(),
  email:           z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password:        z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  confirmPassword: z.string(),
  planId:          z.number({ error: 'กรุณาเลือกแพ็กเกจ' }).min(1, 'กรุณาเลือกแพ็กเกจ'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  id: number;
  name: string;
  price: number;
  description: string | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

interface PlatformSettings {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrCodeUrl?: string;
}

// ── Static Tailwind plan styles (JIT-safe) ────────────────────────────────────

const PLAN_STYLES = [
  { selectedBorder: 'border-violet-500',  selectedBg: 'bg-violet-50',  check: 'bg-violet-500'  },
  { selectedBorder: 'border-blue-500',    selectedBg: 'bg-blue-50',    check: 'bg-blue-500'    },
  { selectedBorder: 'border-emerald-500', selectedBg: 'bg-emerald-50', check: 'bg-emerald-500' },
  { selectedBorder: 'border-orange-500',  selectedBg: 'bg-orange-50',  check: 'bg-orange-500'  },
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionCard({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
          {icon}
        </div>
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, error, required, children,
}: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const errCls = (err?: { message?: string }) =>
  err ? 'border-red-400 focus-visible:ring-red-400' : '';

function InfoRow({
  label, value, copyable,
}: { label: string; value: string; copyable?: boolean }) {
  const copy = () => {
    navigator.clipboard.writeText(value);
    toast.success('คัดลอกแล้ว');
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800 tracking-wide">{value}</span>
        {copyable && (
          <button onClick={copy} className="text-slate-400 hover:text-violet-500 transition-colors p-0.5">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Register() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansFailed, setPlansFailed] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedPlanId = watch('planId');

  useEffect(() => {
    // `/plans/active` is the public endpoint. `/plans` requires a session, which
    // nobody on the sign-up page has yet — it always answered 401 here, and the
    // swallowed error left the picker spinning forever.
    api.get<Plan[]>('/plans/active')
      .then(r => setPlans([...r.data].sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch(() => setPlansFailed(true))
      .finally(() => setPlansLoading(false));

    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    setSlipPreview(URL.createObjectURL(file));
  };

  const clearSlip = () => {
    setSlipFile(null);
    setSlipPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: FormValues) => {
    if (!slipFile) {
      toast.error('กรุณาแนบสลิปการโอนเงินก่อนส่งคำขอ');
      return;
    }
    setSubmitting(true);
    try {
      const slipUrl = await uploadImageToSupabase(slipFile, 'slips');
      // confirmPassword exists only so zod can check the two fields match — it is
      // not part of the API contract, and the server rejects unknown properties.
      const { confirmPassword: _confirm, ...payload } = data;
      await api.post('/auth/register-tenant', { ...payload, slipUrl });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">สมัครสำเร็จ!</h2>
          <p className="text-slate-500 leading-relaxed mb-8">
            ทีมงานจะตรวจสอบสลิปโอนเงินและ<strong>อนุมัติภายใน 24 ชั่วโมง</strong>
            <br />เราจะแจ้งทางอีเมลเมื่อบัญชีพร้อมใช้งาน
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors w-full"
          >
            กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-black text-xl text-primary">ChabaPOS</span>
          <p className="text-sm text-slate-400">
            มีบัญชีแล้ว?{' '}
            <Link to="/auth" className="text-primary font-semibold hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-900">สมัครใช้งาน ChabaPOS</h2>
          <p className="text-slate-400 text-sm mt-1.5">
            กรอกข้อมูล · เลือกแพ็กเกจ · แนบสลิป — ครบในหน้าเดียว
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* ── Section 1: Personal info ─────────────────────────────── */}
          <SectionCard icon={<User className="w-4 h-4" />} title="ข้อมูลส่วนตัวและร้านค้า">
            <div className="grid grid-cols-2 gap-4">
              <Field label="ชื่อ" required error={errors.firstName?.message}>
                <Input placeholder="สมชาย" {...register('firstName')} className={errCls(errors.firstName)} />
              </Field>
              <Field label="นามสกุล" required error={errors.lastName?.message}>
                <Input placeholder="รักชาติ" {...register('lastName')} className={errCls(errors.lastName)} />
              </Field>
            </div>
            <Field label="ชื่อร้านค้า / แบรนด์" required error={errors.shopName?.message}>
              <Input placeholder="เช่น ร้านข้าวต้มสมศรี" {...register('shopName')} className={errCls(errors.shopName)} />
            </Field>
            <Field label="เบอร์โทรศัพท์ (ไม่บังคับ)">
              <Input placeholder="0812345678" {...register('phone')} />
            </Field>
            <Field label="อีเมล" required error={errors.email?.message}>
              <Input type="email" placeholder="example@mail.com" {...register('email')} className={errCls(errors.email)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="รหัสผ่าน" required error={errors.password?.message}>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    {...register('password')}
                    className={`pr-10 ${errCls(errors.password)}`}
                  />
                  <button type="button" tabIndex={-1}
                    onMouseDown={() => setShowPassword(true)} onMouseUp={() => setShowPassword(false)} onMouseLeave={() => setShowPassword(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="ยืนยันรหัสผ่าน" required error={errors.confirmPassword?.message}>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className={`pr-10 ${errCls(errors.confirmPassword)}`}
                  />
                  <button type="button" tabIndex={-1}
                    onMouseDown={() => setShowConfirm(true)} onMouseUp={() => setShowConfirm(false)} onMouseLeave={() => setShowConfirm(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </Field>
            </div>
          </SectionCard>

          {/* ── Section 2: Plan selection ────────────────────────────── */}
          <SectionCard icon={<Package className="w-4 h-4" />} title="เลือกแพ็กเกจ">
            {(errors.planId as any)?.message && (
              <p className="text-sm text-red-500 -mt-2">{(errors.planId as any).message}</p>
            )}
            {plansLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">กำลังโหลดแพ็กเกจ...</span>
              </div>
            ) : plansFailed ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Package className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-500">โหลดข้อมูลแพ็กเกจไม่สำเร็จ</p>
                <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                  ลองอีกครั้ง
                </Button>
              </div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Package className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-500">ยังไม่มีแพ็กเกจเปิดให้สมัครในขณะนี้</p>
                <p className="text-xs text-slate-400">กรุณาติดต่อทีมงาน</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan, idx) => {
                  const style = PLAN_STYLES[idx % PLAN_STYLES.length];
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setValue('planId', plan.id, { shouldValidate: true })}
                      className={`relative w-full text-left border-2 rounded-xl p-4 transition-all duration-150 ${
                        isSelected
                          ? `${style.selectedBorder} ${style.selectedBg}`
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className={`absolute top-3 right-3 w-6 h-6 ${style.check} rounded-full flex items-center justify-center`}>
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className="flex items-start justify-between pr-10">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900">{plan.name}</p>
                          {plan.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{plan.description}</p>
                          )}
                          {Array.isArray(plan.features) && plan.features.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(plan.features as string[]).map(f => (
                                <span key={f} className="text-[10px] bg-white/80 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                                  {FEATURE_LABELS[f as FeatureKey]?.name ?? f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right ml-4">
                          <p className="text-xl font-black text-slate-900">
                            {plan.price === 0 ? 'ฟรี' : `฿${plan.price.toLocaleString()}`}
                          </p>
                          {plan.price > 0 && <p className="text-xs text-slate-400">/เดือน</p>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* ── Section 3: Payment ───────────────────────────────────── */}
          <SectionCard icon={<Banknote className="w-4 h-4" />} title="ชำระเงิน">
            {settings?.bankName ? (
              <>
                <p className="text-sm text-slate-500">โอนเงินค่าบริการมายังบัญชีด้านล่าง แล้วแนบสลิป</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  {settings.bankName && <InfoRow label="ธนาคาร" value={settings.bankName} />}
                  {settings.accountName && <InfoRow label="ชื่อบัญชี" value={settings.accountName} />}
                  {settings.accountNumber && (
                    <InfoRow label="เลขที่บัญชี" value={settings.accountNumber} copyable />
                  )}
                </div>
                {settings.qrCodeUrl && (
                  <div className="flex justify-center pt-1">
                    <img
                      src={settings.qrCodeUrl}
                      alt="QR PromptPay"
                      className="w-44 h-44 object-contain rounded-xl border border-slate-200"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-sm text-amber-700">ติดต่อผู้ดูแลระบบเพื่อรับข้อมูลการชำระเงิน</p>
              </div>
            )}

            {/* Slip upload */}
            <div className="pt-2">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                สลิปการโอนเงิน <span className="text-red-500">*</span>
              </Label>
              {slipPreview ? (
                <div className="relative inline-block w-full">
                  <img
                    src={slipPreview}
                    alt="สลิป"
                    className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={clearSlip}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center gap-3 text-slate-400 hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Upload className="w-8 h-8" />
                  <p className="text-sm font-medium">คลิกเพื่ออัปโหลดสลิป</p>
                  <p className="text-xs opacity-60">PNG, JPG — ไม่เกิน 2MB</p>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </SectionCard>

          {/* Submit */}
          <Button type="submit" className="w-full h-14 text-base font-semibold" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />กำลังส่งคำขอ...</>
            ) : (
              'ส่งคำขอสมัครสมาชิก'
            )}
          </Button>

          <p className="text-center text-xs text-slate-400 pb-4">
            เมื่อส่งคำขอ ทีมงานจะตรวจสอบสลิปและ<strong>อนุมัติภายใน 24 ชั่วโมง</strong>
          </p>
        </form>
      </div>
    </div>
  );
}
