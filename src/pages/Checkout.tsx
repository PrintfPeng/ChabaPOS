import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Banknote, CheckCircle2, Upload, X, Loader2, Copy,
  Package, ArrowLeft, Store, AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import { uploadImageToSupabase } from '../lib/supabase-storage';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { FEATURE_LABELS } from '../lib/feature-config';
import type { FeatureKey } from '../lib/feature-config';

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

interface Brand {
  id: number;
  name: string;
}

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

function CenteredNotice({
  title, detail, action,
}: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">{title}</h2>
        {detail && <p className="text-slate-500 text-sm leading-relaxed mb-6">{detail}</p>}
        {action}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = Number(searchParams.get('planId'));

  const [plan, setPlan] = useState<Plan | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!planId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [plansRes, settingsRes, brandsRes] = await Promise.all([
          api.get<Plan[]>('/plans/active'),
          api.get<PlatformSettings>('/settings'),
          api.get<Brand[]>('/brands'),
        ]);
        if (cancelled) return;

        setPlan(plansRes.data.find(p => p.id === planId) ?? null);
        setSettings(settingsRes.data);
        setBrands(brandsRes.data);
        // Auto-select when there's only one tenant — matches the server's rule.
        if (brandsRes.data.length === 1) setSelectedBrandId(brandsRes.data[0].id);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [planId]);

  // Revoke the object URL so repeated re-picks don't leak blobs.
  useEffect(() => {
    return () => { if (slipPreview) URL.revokeObjectURL(slipPreview); };
  }, [slipPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipFile(file);
    setSlipPreview(URL.createObjectURL(file));
  };

  const clearSlip = () => {
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipFile(null);
    setSlipPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    if (!slipFile) {
      toast.error('กรุณาแนบสลิปการโอนเงินก่อนส่งคำขอ');
      return;
    }
    if (brands.length > 1 && !selectedBrandId) {
      toast.error('กรุณาเลือกร้านค้าที่ต้องการอัปเกรด');
      return;
    }

    setSubmitting(true);
    try {
      // Slip goes straight to Supabase Storage; the API only ever receives the
      // resulting URL (same flow as tenant sign-up).
      const slipUrl = await uploadImageToSupabase(slipFile, 'slips');

      await api.post('/billing/checkout', {
        planId: plan.id,
        slipUrl,
        ...(selectedBrandId ? { brandId: selectedBrandId } : {}),
      });

      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guard states ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-slate-500 text-sm">กำลังโหลดข้อมูลการชำระเงิน...</p>
      </div>
    );
  }

  if (!planId) {
    return (
      <CenteredNotice
        title="ไม่พบแพ็กเกจที่เลือก"
        detail="กรุณากลับไปเลือกแพ็กเกจที่ต้องการอีกครั้ง"
        action={<Button className="w-full" onClick={() => navigate('/pricing')}>เลือกแพ็กเกจ</Button>}
      />
    );
  }

  if (loadFailed) {
    return (
      <CenteredNotice
        title="โหลดข้อมูลไม่สำเร็จ"
        detail="กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง"
        action={<Button className="w-full" onClick={() => window.location.reload()}>ลองใหม่</Button>}
      />
    );
  }

  if (!plan) {
    return (
      <CenteredNotice
        title="แพ็กเกจนี้ไม่เปิดให้สมัครแล้ว"
        detail="แพ็กเกจอาจถูกปิดการใช้งาน กรุณาเลือกแพ็กเกจอื่น"
        action={<Button className="w-full" onClick={() => navigate('/pricing')}>ดูแพ็กเกจทั้งหมด</Button>}
      />
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">ส่งข้อมูลสำเร็จ!</h2>
          <p className="text-slate-500 leading-relaxed mb-8">
            กรุณารอแอดมินตรวจสอบ<strong>ภายใน 24 ชั่วโมง</strong>
            <br />เราจะแจ้งทางอีเมลเมื่อแพ็กเกจถูกเปิดใช้งาน
          </p>
          <Button className="w-full" onClick={() => navigate('/brands')}>
            กลับสู่หน้าร้านค้า
          </Button>
        </div>
      </div>
    );
  }

  // ── Checkout form ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/pricing" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            เปลี่ยนแพ็กเกจ
          </Link>
          <span className="font-black text-xl text-primary">ChabaPOS</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-900">ยืนยันการชำระเงิน</h2>
          <p className="text-slate-400 text-sm mt-1.5">
            โอนเงิน · แนบสลิป · รอแอดมินอนุมัติ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Order summary ───────────────────────────────────────── */}
          <SectionCard icon={<Package className="w-4 h-4" />} title="สรุปรายการ">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{plan.name}</p>
                {plan.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{plan.description}</p>
                )}
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {plan.features.map(f => (
                      <span key={f} className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                        {FEATURE_LABELS[f as FeatureKey]?.name ?? f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-black text-slate-900">
                  {plan.price === 0 ? 'ฟรี' : `฿${plan.price.toLocaleString()}`}
                </p>
                {plan.price > 0 && <p className="text-xs text-slate-400">/เดือน</p>}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <span className="font-bold text-slate-800">ยอดชำระทั้งหมด</span>
              <span className="text-2xl font-black text-primary">
                ฿{plan.price.toLocaleString()}
              </span>
            </div>
          </SectionCard>

          {/* ── Tenant picker (only when the account owns several) ───── */}
          {brands.length > 1 && (
            <SectionCard icon={<Store className="w-4 h-4" />} title="เลือกร้านค้าที่ต้องการอัปเกรด">
              <div className="space-y-2">
                {brands.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrandId(b.id)}
                    className={`w-full text-left border-2 rounded-xl px-4 py-3 font-semibold transition-all ${
                      selectedBrandId === b.id
                        ? 'border-violet-500 bg-violet-50 text-violet-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Payment ─────────────────────────────────────────────── */}
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
                  <InfoRow label="ยอดที่ต้องโอน" value={`฿${plan.price.toLocaleString()}`} />
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
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />กำลังส่งข้อมูล...</>
            ) : (
              'ยืนยันการชำระเงิน'
            )}
          </Button>

          <p className="text-center text-xs text-slate-400 pb-4">
            เมื่อส่งข้อมูล ทีมงานจะตรวจสอบสลิปและ<strong>อนุมัติภายใน 24 ชั่วโมง</strong>
          </p>
        </form>
      </div>
    </div>
  );
}
