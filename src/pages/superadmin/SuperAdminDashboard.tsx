import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Building2, Users, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChartPoint { label: string; value: number }

interface RecentTenant {
  id: number
  brandName: string
  plan: string
  branches: number
  status: string
  createdAt: string
}

interface DashboardData {
  totalTenants: number
  totalBranches: number
  mrr: number
  totalRevenue: number
  newTenantsChart: ChartPoint[]
  revenueChart: ChartPoint[]
  recentTenants: RecentTenant[]
}

interface StatProps {
  label: string; value: string; sub: string;
  icon: React.ElementType; iconBg: string;
  trend?: 'up' | 'down'; trendVal: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `฿${Math.round(n / 1_000)}K`;
  return `฿${n.toLocaleString('th-TH')}`;
}

function fmtCount(n: number): string {
  return n.toLocaleString('th-TH');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  });
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function LineChart({ data, color = '#7c3aed' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;

  const W = 500; const H = 90;
  const PX = 8; const PT = 12; const PB = 6;
  const chartH = H - PT - PB;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const x = (i: number) => PX + (i / (data.length - 1)) * (W - PX * 2);
  const y = (v: number) => PT + (1 - (v - min) / range) * chartH;
  const pts: [number, number][] = data.map((v, i) => [x(i), y(v)]);

  const linePath = pts.reduce((acc, [cx, cy], i) => {
    if (i === 0) return `M ${cx},${cy}`;
    const [px, py] = pts[i - 1];
    const cpx = (px + cx) / 2;
    return `${acc} C ${cpx},${py} ${cpx},${cy} ${cx},${cy}`;
  }, '');

  const areaPath = `${linePath} L ${pts.at(-1)![0]},${H} L ${pts[0][0]},${H} Z`;
  const gradId   = `lgrad-${color.replace(/[^\w]/g, '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0.33, 0.66].map(f => (
        <line key={f}
          x1={PX} x2={W - PX}
          y1={PT + f * chartH} y2={PT + f * chartH}
          stroke="#f1f5f9" strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4.5" fill={color} stroke="white" strokeWidth="2.5" />
      ))}
    </svg>
  );
}

// ─── CSS Vertical Bar Chart ───────────────────────────────────────────────────
function BarChart({ data, color = 'bg-violet-500' }: { data: ChartPoint[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const BAR_AREA = 96;

  return (
    <div className="flex gap-1.5 items-end">
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d.value / max) * BAR_AREA), 4);
        return (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="flex flex-col justify-end items-center w-full" style={{ height: BAR_AREA }}>
              <span className="text-[9px] font-black text-slate-500 mb-1 tabular-nums">
                {d.value >= 1000 ? `฿${(d.value / 1000).toFixed(0)}K` : d.value || ''}
              </span>
              <div
                className={cn('w-full rounded-t-md hover:opacity-80 transition-opacity', color)}
                style={{ height: barH }}
              />
            </div>
            <span className="text-[9px] font-bold text-slate-400 mt-1.5 whitespace-nowrap">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, iconBg, trend, trendVal }: StatProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={cn(
          'flex items-center gap-0.5 text-xs font-black px-2 py-1 rounded-full',
          trend === 'up'   ? 'bg-emerald-50 text-emerald-600'
          : trend === 'down' ? 'bg-red-50 text-red-500'
          : 'bg-slate-100 text-slate-500',
        )}>
          {trend === 'up'   && <ArrowUpRight   className="w-3 h-3" />}
          {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
          {trendVal}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">{value}</p>
        <p className="text-sm font-semibold text-slate-600 mt-0.5">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Skeleton components ──────────────────────────────────────────────────────
function Pulse({ className }: { className?: string }) {
  return <div className={cn('bg-slate-200 rounded animate-pulse', className)} />;
}

function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <Pulse className="w-10 h-10 rounded-xl" />
        <Pulse className="w-20 h-6 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <Pulse className="w-28 h-7" />
        <Pulse className="w-24 h-4" />
        <Pulse className="w-32 h-3" />
      </div>
    </div>
  );
}

function SkeletonChartCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Pulse className="w-36 h-4" />
          <Pulse className="w-24 h-3" />
        </div>
        <Pulse className="w-24 h-6 rounded-full" />
      </div>
      <Pulse className="w-full h-24 rounded-xl" />
    </div>
  );
}

// ─── Badge configs ────────────────────────────────────────────────────────────
const PLAN_BADGE: Record<string, string> = {
  '-':        'bg-slate-100 text-slate-500',
  FREE:       'bg-slate-100 text-slate-600',
  STARTER:    'bg-sky-50 text-sky-700',
  PRO:        'bg-violet-50 text-violet-700',
  ENTERPRISE: 'bg-amber-50 text-amber-700',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-emerald-50 text-emerald-700',
  TRIAL:     'bg-sky-50 text-sky-600',
  SUSPENDED: 'bg-red-50 text-red-600',
  PENDING:   'bg-amber-50 text-amber-700',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    'Active',
  TRIAL:     'ทดลองใช้',
  SUSPENDED: 'ระงับ',
  PENDING:   'รออนุมัติ',
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    api.get<DashboardData>('/super-admin/dashboard')
      .then(res => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Derived chart values (only after data loads)
  const weekTotal = data?.newTenantsChart.reduce((s, p) => s + p.value, 0) ?? 0;
  const curRev    = data?.revenueChart.at(-1)?.value ?? 0;
  const prevRev   = data?.revenueChart.at(-2)?.value ?? 0;
  const revPct    = prevRev > 0 ? ((curRev - prevRev) / prevRev * 100).toFixed(1) : null;

  if (error) {
    return (
      <div className="p-5 sm:p-7 flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-slate-500 font-semibold">ไม่สามารถโหลดข้อมูลได้</p>
        <button
          onClick={() => { setError(false); setLoading(true); api.get<DashboardData>('/super-admin/dashboard').then(res => setData(res.data)).catch(() => setError(true)).finally(() => setLoading(false)); }}
          className="px-4 py-2 text-sm font-bold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 space-y-7 max-w-7xl mx-auto w-full">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-black text-slate-900">ภาพรวมระบบ</h1>
        <p className="text-sm text-slate-400 font-medium mt-0.5">{dateStr}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonStatCard /><SkeletonStatCard />
            <SkeletonStatCard /><SkeletonStatCard />
          </>
        ) : data ? (
          <>
            <StatCard
              label="ร้านค้าทั้งหมด"  value={fmtCount(data.totalTenants)}
              sub="Tenants ที่ยังใช้งาน"
              icon={Building2} iconBg="bg-violet-600"
              trend={weekTotal > 0 ? 'up' : undefined}
              trendVal={weekTotal > 0 ? `+${weekTotal} ราย/สัปดาห์` : 'Tenants'}
            />
            <StatCard
              label="สาขา (Active)"   value={fmtCount(data.totalBranches)}
              sub="ทุกสาขาทั่วประเทศ"
              icon={Users} iconBg="bg-sky-500"
              trendVal="สาขา"
            />
            <StatCard
              label="MRR"             value={fmtMoney(data.mrr)}
              sub="Monthly Recurring Revenue"
              icon={TrendingUp} iconBg="bg-emerald-500"
              trendVal="รายเดือน"
            />
            <StatCard
              label="รายได้สะสม"     value={fmtMoney(data.totalRevenue)}
              sub="All-time revenue"
              icon={DollarSign} iconBg="bg-amber-500"
              trendVal="ยอดสะสม"
            />
          </>
        ) : (
          <div className="col-span-4 text-center py-8 text-sm text-slate-400">
            โหลดข้อมูลไม่สำเร็จ
          </div>
        )}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loading ? (
          <><SkeletonChartCard /><SkeletonChartCard /></>
        ) : data ? (
          <>
            {/* Line chart — signup trend */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-black text-slate-900 text-sm">ร้านค้าใหม่รายสัปดาห์</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">7 วันล่าสุด</p>
                </div>
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  weekTotal > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500',
                )}>
                  {weekTotal > 0 ? `+${weekTotal} รายการ` : 'ยังไม่มีรายการใหม่'}
                </span>
              </div>
              <LineChart data={data.newTenantsChart.map(p => p.value)} color="#7c3aed" />
              <div className="flex mt-2">
                {data.newTenantsChart.map((p, i) => (
                  <span key={i} className="flex-1 text-center text-[9px] font-bold text-slate-400">
                    {p.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Bar chart — monthly revenue */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-black text-slate-900 text-sm">รายได้รายเดือน</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">6 เดือนล่าสุด (บาท)</p>
                </div>
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  revPct !== null
                    ? Number(revPct) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    : 'bg-slate-100 text-slate-500',
                )}>
                  {revPct !== null
                    ? `${Number(revPct) >= 0 ? '↑' : '↓'} ${Math.abs(Number(revPct))}% vs เดือนก่อน`
                    : 'ไม่มีข้อมูล'}
                </span>
              </div>
              <BarChart data={data.revenueChart} color="bg-violet-500" />
            </div>
          </>
        ) : null}
      </div>

      {/* ── Recent tenants ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-black text-slate-900 text-sm">ร้านค้าที่สมัครล่าสุด</p>
          <a href="/super-admin/tenants"
            className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
            ดูทั้งหมด →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['ร้านค้า', 'แพ็กเกจ', 'สาขา', 'สถานะ', 'สมัครเมื่อ'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><Pulse className="h-4 w-32" /></td>
                    <td className="px-5 py-3"><Pulse className="h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3"><Pulse className="h-4 w-6" /></td>
                    <td className="px-5 py-3"><Pulse className="h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3"><Pulse className="h-4 w-20" /></td>
                  </tr>
                ))
              ) : !data || data.recentTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    ยังไม่มีร้านค้าในระบบ
                  </td>
                </tr>
              ) : (
                data.recentTenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-800">{t.brandName}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-[10px] font-black px-2.5 py-1 rounded-full',
                        PLAN_BADGE[t.plan] ?? 'bg-slate-100 text-slate-500',
                      )}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-600">{t.branches}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-[10px] font-black px-2.5 py-1 rounded-full',
                        STATUS_BADGE[t.status] ?? 'bg-slate-100 text-slate-500',
                      )}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 font-medium">
                      {fmtDate(t.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
