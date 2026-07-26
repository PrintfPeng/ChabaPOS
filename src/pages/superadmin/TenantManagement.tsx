import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, Ban, CheckCircle2, KeyRound, AlertTriangle,
  PackageOpen, Loader2, RefreshCw, ArrowLeftRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { toast } from 'sonner';
import api from '../../lib/api';

// ─── API Types ────────────────────────────────────────────────────────────────

interface PlanSummary {
  id: number;
  name: string;
  price: number;
  description: string | null;
}

interface ApiTenant {
  id: number;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  planId: number | null;
  plan: PlanSummary | null;
  planExpiresAt: string | null;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count: {
    branches: number;
  };
}

interface FullPlan extends PlanSummary {
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const PLAN_COLORS = [
  'bg-slate-100 text-slate-600 border-slate-200',   // no plan / index 0
  'bg-sky-50   text-sky-700   border-sky-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-amber-50  text-amber-700  border-amber-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-rose-50   text-rose-700   border-rose-200',
];

const STATUS_STYLE = {
  ACTIVE:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUSPENDED: 'bg-red-50     text-red-600     border-red-200',
  TRIAL:     'bg-sky-50     text-sky-600     border-sky-200',
} as const;

const STATUS_LABEL = {
  ACTIVE: 'Active', SUSPENDED: 'ระงับ', TRIAL: 'ทดลองใช้',
} as const;

function planColor(plans: FullPlan[], planId: number | null) {
  if (!planId) return PLAN_COLORS[0];
  const idx = plans.findIndex(p => p.id === planId);
  return PLAN_COLORS[(idx + 1) % PLAN_COLORS.length];
}

function ownerName(t: ApiTenant) {
  return `${t.user.firstName} ${t.user.lastName}`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpired(d: string | null) {
  return !!d && new Date(d) < new Date();
}

// ─── Filter pills ─────────────────────────────────────────────────────────────

function FilterPills<T extends string | number>({
  options, value, onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1 flex-wrap">
      {options.map(o => (
        <button
          key={String(o.key)}
          onClick={() => onChange(o.key)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
            value === o.key
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TenantManagement() {
  const [tenants, setTenants]         = useState<ApiTenant[]>([]);
  const [plans,   setPlans]           = useState<FullPlan[]>([]);
  const [loading, setLoading]         = useState(true);

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'TRIAL'>('ALL');
  const [planFilter,   setPlanFilter]   = useState<number | 'ALL'>('ALL');

  const [loginTarget,     setLoginTarget]     = useState<ApiTenant | null>(null);
  const [viewTarget,      setViewTarget]      = useState<ApiTenant | null>(null);
  const [changePlanTarget, setChangePlanTarget] = useState<ApiTenant | null>(null);
  const [selectedPlanId,  setSelectedPlanId]  = useState<number | null>(null);
  const [changingPlan,    setChangingPlan]    = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        api.get<ApiTenant[]>('/super-admin/tenants'),
        api.get<FullPlan[]>('/plans'),
      ]);
      setTenants(tenantsRes.data);
      setPlans(plansRes.data);
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || t.name.toLowerCase().includes(q)
      || t.user.email.toLowerCase().includes(q)
      || ownerName(t).toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchPlan   = planFilter   === 'ALL' || t.planId === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  // ── Status toggle ─────────────────────────────────────────────────────────

  const toggleStatus = async (t: ApiTenant) => {
    const nextStatus = t.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await api.patch(`/super-admin/tenants/${t.id}/status`, { status: nextStatus });
      setTenants(prev =>
        prev.map(x => x.id === t.id ? { ...x, status: nextStatus } : x),
      );
      toast.success(
        `${t.name} — ${nextStatus === 'ACTIVE' ? 'เปิดใช้งานแล้ว ✓' : 'ระงับแล้ว'}`,
      );
    } catch {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  // ── Change Plan ───────────────────────────────────────────────────────────

  const openChangePlan = (t: ApiTenant) => {
    setChangePlanTarget(t);
    setSelectedPlanId(t.planId);
  };

  const handleChangePlan = async () => {
    if (!changePlanTarget) return;
    setChangingPlan(true);
    try {
      await api.patch(`/super-admin/tenants/${changePlanTarget.id}/plan`, {
        planId: selectedPlanId,
      });
      // Optimistic update
      const pickedPlan = plans.find(p => p.id === selectedPlanId) ?? null;
      setTenants(prev =>
        prev.map(x =>
          x.id === changePlanTarget.id
            ? { ...x, planId: selectedPlanId, plan: pickedPlan ? { id: pickedPlan.id, name: pickedPlan.name, price: pickedPlan.price, description: pickedPlan.description } : null }
            : x,
        ),
      );
      toast.success('เปลี่ยนแพ็กเกจสำเร็จ ✓');
      setChangePlanTarget(null);
    } catch {
      toast.error('เปลี่ยนแพ็กเกจไม่สำเร็จ');
    } finally {
      setChangingPlan(false);
    }
  };

  // ── Login As ──────────────────────────────────────────────────────────────

  const confirmLoginAs = (t: ApiTenant) => {
    toast.success(`กำลังเข้าระบบในฐานะ "${t.name}"…`);
    setLoginTarget(null);
  };

  // ── Plan filter options ───────────────────────────────────────────────────

  const planFilterOptions: { key: number | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All Plan' },
    ...plans.map(p => ({ key: p.id, label: p.name })),
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">จัดการร้านค้า</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            {loading
              ? 'กำลังโหลด…'
              : `แสดง ${filtered.length} จาก ${tenants.length} ร้านค้า`
            }
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          title="รีเฟรช"
          className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="ค้นหาชื่อร้าน, เจ้าของ, อีเมล..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl text-sm border-slate-200"
          />
        </div>

        <FilterPills
          value={statusFilter}
          // Wrapped rather than passing the setter directly: a bare
          // Dispatch<SetStateAction<T>> also accepts an updater function, which
          // does not match FilterPills' plain (v: T) => void.
          onChange={v => setStatusFilter(v)}
          options={[
            { key: 'ALL',       label: 'ทั้งหมด' },
            { key: 'ACTIVE',    label: 'Active'  },
            { key: 'TRIAL',     label: 'ทดลองใช้'},
            { key: 'SUSPENDED', label: 'ระงับ'   },
          ]}
        />

        <FilterPills
          value={planFilter}
          onChange={v => setPlanFilter(v)}
          options={planFilterOptions}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">กำลังโหลดข้อมูล…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">ร้านค้า</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">เจ้าของ</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">สาขา</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">แพ็กเกจ</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">สถานะ</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">หมดอายุ</th>
                  <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">

                    {/* Brand */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center text-violet-700 font-black text-sm shrink-0">
                          {t.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-snug">{t.name}</p>
                          <p className="text-[11px] text-slate-400 md:hidden">{t.user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="font-semibold text-slate-700 text-sm leading-snug">{ownerName(t)}</p>
                      <p className="text-[11px] text-slate-400">{t.user.email}</p>
                    </td>

                    {/* Branches */}
                    <td className="px-4 py-3.5 text-center font-black text-slate-700">
                      {t._count.branches}
                    </td>

                    {/* Plan + Change button */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          'text-[10px] font-black px-2.5 py-1 rounded-full border',
                          planColor(plans, t.planId),
                        )}>
                          {t.plan?.name ?? 'ไม่มีแพ็กเกจ'}
                        </span>
                        <button
                          onClick={() => openChangePlan(t)}
                          title="เปลี่ยนแพ็กเกจ"
                          className="w-5 h-5 rounded-md bg-slate-100 text-slate-400 hover:bg-violet-100 hover:text-violet-600 flex items-center justify-center transition-colors"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        'text-[10px] font-black px-2.5 py-1 rounded-full border',
                        STATUS_STYLE[t.status],
                      )}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </td>

                    {/* Expiry */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className={cn(
                        'text-xs font-semibold',
                        isExpired(t.planExpiresAt) ? 'text-red-500' : 'text-slate-500',
                      )}>
                        {formatDate(t.planExpiresAt)}
                        {isExpired(t.planExpiresAt) && ' ⚠'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewTarget(t)}
                          title="ดูรายละเอียด"
                          className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => toggleStatus(t)}
                          title={t.status === 'SUSPENDED' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
                          className={cn(
                            'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                            t.status === 'SUSPENDED'
                              ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-400 hover:bg-red-100',
                          )}
                        >
                          {t.status === 'SUSPENDED'
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : <Ban          className="w-3.5 h-3.5" />
                          }
                        </button>

                        <button
                          onClick={() => setLoginTarget(t)}
                          title="Login as Tenant"
                          className="w-8 h-8 rounded-xl bg-violet-50 text-violet-500 hover:bg-violet-100 flex items-center justify-center transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-semibold">
                      ไม่พบร้านค้าที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Change Plan Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!changePlanTarget}
        onOpenChange={o => { if (!o) setChangePlanTarget(null); }}
      >
        {changePlanTarget && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-violet-600" />
                เปลี่ยนแพ็กเกจ
              </DialogTitle>
            </DialogHeader>

            {/* Tenant summary */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center text-violet-700 font-black text-sm shrink-0">
                {changePlanTarget.name[0]}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{changePlanTarget.name}</p>
                <p className="text-xs text-slate-400">{changePlanTarget.user.email}</p>
              </div>
            </div>

            {/* Plan selector */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {/* No Plan option */}
              <label className={cn(
                'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                selectedPlanId === null
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-slate-100 bg-white hover:border-slate-200',
              )}>
                <input
                  type="radio"
                  className="sr-only"
                  checked={selectedPlanId === null}
                  onChange={() => setSelectedPlanId(null)}
                />
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                  selectedPlanId === null ? 'border-violet-500' : 'border-slate-300',
                )}>
                  {selectedPlanId === null && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">ไม่มีแพ็กเกจ</p>
                  <p className="text-xs text-slate-400">ลบแพ็กเกจออกจากร้านค้านี้</p>
                </div>
                <span className="text-xs font-black text-slate-400">FREE</span>
              </label>

              {plans.map((plan, i) => {
                const isSelected = selectedPlanId === plan.id;
                const isCurrent  = changePlanTarget.planId === plan.id;
                return (
                  <label
                    key={plan.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      isSelected
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-100 bg-white hover:border-slate-200',
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => setSelectedPlanId(plan.id)}
                    />
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                      isSelected ? 'border-violet-500' : 'border-slate-300',
                    )}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-700">{plan.name}</p>
                        {isCurrent && (
                          <span className="text-[9px] font-black text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">
                            ปัจจุบัน
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-xs text-slate-400 truncate">{plan.description}</p>
                      )}
                    </div>
                    <span className={cn(
                      'text-xs font-black shrink-0',
                      PLAN_COLORS[(i + 1) % PLAN_COLORS.length].split(' ')[1],
                    )}>
                      {plan.price === 0 ? 'ฟรี' : `฿${plan.price.toLocaleString()}`}
                    </span>
                  </label>
                );
              })}
            </div>

            <DialogFooter className="pt-1">
              <Button variant="ghost" onClick={() => setChangePlanTarget(null)}>
                ยกเลิก
              </Button>
              <Button
                disabled={changingPlan || selectedPlanId === changePlanTarget.planId}
                onClick={handleChangePlan}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                {changingPlan && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Login As — Confirm dialog ──────────────────────────────────────── */}
      <Dialog open={!!loginTarget} onOpenChange={() => setLoginTarget(null)}>
        {loginTarget && (
          <DialogContent className="max-w-sm rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
            <div className="p-6 space-y-5">
              <DialogHeader>
                <DialogTitle className="text-base font-black text-slate-900">
                  Login as Tenant
                </DialogTitle>
              </DialogHeader>

              <div className="flex gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">สวมรอยเข้าระบบ</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    คุณจะเข้าระบบในฐานะเจ้าของร้าน{' '}
                    <span className="font-black">{loginTarget.name}</span>{' '}
                    ทุกการกระทำจะถูกบันทึก Audit Log ไว้
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                <p className="text-sm font-bold text-slate-800">{loginTarget.name}</p>
                <p className="text-xs text-slate-500">{loginTarget.user.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={cn(
                    'text-[10px] font-black px-2 py-0.5 rounded-full border',
                    planColor(plans, loginTarget.planId),
                  )}>
                    {loginTarget.plan?.name ?? 'ไม่มีแพ็กเกจ'}
                  </span>
                  <span className={cn(
                    'text-[10px] font-black px-2 py-0.5 rounded-full border',
                    STATUS_STYLE[loginTarget.status],
                  )}>
                    {STATUS_LABEL[loginTarget.status]}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl font-bold border-slate-200"
                  onClick={() => setLoginTarget(null)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="flex-1 h-10 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => confirmLoginAs(loginTarget)}
                >
                  ยืนยัน
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── View Detail dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
        {viewTarget && (
          <DialogContent className="max-w-sm rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
            <div className="p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-black text-slate-900">
                  {viewTarget.name}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'เจ้าของ',  value: ownerName(viewTarget) },
                  { label: 'สาขา',     value: `${viewTarget._count.branches} สาขา` },
                  { label: 'แพ็กเกจ',  value: viewTarget.plan?.name ?? 'ไม่มีแพ็กเกจ' },
                  { label: 'ราคา/เดือน', value: viewTarget.plan ? `฿${viewTarget.plan.price.toLocaleString()}` : '—' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</p>
                    <p className="font-bold text-slate-800 mt-1 text-sm">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">อีเมล</p>
                <p className="font-bold text-slate-800 mt-1 text-sm break-all">{viewTarget.user.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">หมดอายุ</p>
                  <p className={cn(
                    'font-bold mt-1 text-sm',
                    isExpired(viewTarget.planExpiresAt) ? 'text-red-500' : 'text-slate-800',
                  )}>
                    {formatDate(viewTarget.planExpiresAt)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">สมัครเมื่อ</p>
                  <p className="font-bold text-slate-800 mt-1 text-sm">{formatDate(viewTarget.createdAt)}</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-10 rounded-xl font-bold border-slate-200"
                onClick={() => setViewTarget(null)}
              >
                ปิด
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
