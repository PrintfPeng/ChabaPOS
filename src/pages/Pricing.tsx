import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Check, Loader2, Package, ChevronRight, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { FEATURE_LABELS } from '../lib/feature-config';
import type { FeatureKey } from '../lib/feature-config';

interface Plan {
  id: number;
  name: string;
  price: number;
  description: string | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

const CARD_THEMES = [
  {
    header: 'from-slate-700 to-slate-900',
    badge: null,
    ring: 'ring-slate-200',
    btn: 'bg-slate-800 hover:bg-slate-900 text-white',
  },
  {
    header: 'from-violet-600 to-violet-800',
    badge: 'แนะนำ',
    ring: 'ring-2 ring-violet-400',
    btn: 'bg-violet-600 hover:bg-violet-700 text-white',
  },
  {
    header: 'from-emerald-600 to-emerald-800',
    badge: null,
    ring: 'ring-emerald-200',
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  {
    header: 'from-amber-500 to-amber-700',
    badge: null,
    ring: 'ring-amber-200',
    btn: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md animate-pulse">
      <div className="h-40 bg-slate-200" />
      <div className="bg-white p-6 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-4 bg-slate-100 rounded w-full" />
        ))}
        <div className="h-10 bg-slate-100 rounded mt-4" />
      </div>
    </div>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /**
   * Signed-in tenants go straight to checkout to upgrade. Visitors without an
   * account can't have a tenant to bill, so they're sent to /register — which
   * already collects plan choice + slip as part of sign-up.
   */
  const handleSelectPlan = (planId: number) => {
    navigate(user ? `/checkout?planId=${planId}` : '/register');
  };

  useEffect(() => {
    api.get<Plan[]>('/plans/active')
      .then(res => setPlans(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900">

      {/* Hero */}
      <div className="text-center px-4 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 bg-violet-500/20 text-violet-300 text-xs font-bold px-4 py-1.5 rounded-full mb-6 border border-violet-500/30">
          <Zap className="w-3.5 h-3.5" />
          ChabaPOS Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
          เลือกแพ็กเกจที่
          <span className="text-violet-400"> เหมาะกับคุณ</span>
        </h1>
        <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
          เริ่มต้นฟรี ไม่มีค่าติดตั้ง เปลี่ยนแพ็กเกจได้ทุกเมื่อ
        </p>
      </div>

      {/* Cards */}
      <div className="px-4 pb-24 max-w-6xl mx-auto">

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
            <Package className="w-16 h-16" />
            <p className="text-lg font-bold">โหลดข้อมูลแพ็กเกจไม่สำเร็จ</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              ลองอีกครั้ง
            </Button>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
            <Package className="w-16 h-16" />
            <p className="text-lg font-bold">ยังไม่มีแพ็กเกจในขณะนี้</p>
            <p className="text-sm">กรุณาติดต่อทีมงานเพื่อรับข้อมูลเพิ่มเติม</p>
          </div>
        )}

        {!loading && !error && plans.length > 0 && (
          <div className={cn(
            'grid gap-6',
            plans.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
            plans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          )}>
            {plans.map((plan, i) => {
              const theme = CARD_THEMES[i % CARD_THEMES.length];
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-2xl overflow-hidden shadow-xl transition-transform hover:-translate-y-1 ring-1',
                    theme.ring,
                  )}
                >
                  {/* Popular badge */}
                  {theme.badge && (
                    <div className="absolute top-4 right-4 z-10 bg-white text-violet-700 text-xs font-black px-3 py-1 rounded-full shadow">
                      ⭐ {theme.badge}
                    </div>
                  )}

                  {/* Header gradient */}
                  <div className={cn('bg-gradient-to-br px-6 py-8 text-white', theme.header)}>
                    <p className="text-sm font-semibold uppercase tracking-widest opacity-75 mb-1">
                      {plan.name}
                    </p>
                    <p className="text-5xl font-black">
                      {plan.price === 0 ? 'ฟรี' : `฿${plan.price.toLocaleString()}`}
                    </p>
                    {plan.price > 0 && (
                      <p className="text-sm opacity-60 mt-1">ต่อเดือน</p>
                    )}
                    {plan.description && (
                      <p className="mt-4 text-sm opacity-80 leading-relaxed">{plan.description}</p>
                    )}
                  </div>

                  {/* Body */}
                  <div className="bg-white px-6 py-6 flex flex-col">
                    <ul className="space-y-3 flex-1">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-3 text-sm text-slate-700">
                          <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-emerald-500" />
                          </span>
                          {FEATURE_LABELS[f as FeatureKey]?.name ?? f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn('w-full mt-6 gap-2 font-bold', theme.btn)}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      เริ่มต้นใช้งาน
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="text-center pb-12 text-slate-500 text-sm px-4">
        <p>ทุกแพ็กเกจรองรับการออกบิล · จัดการสต็อก · รายงานยอดขาย</p>
        <p className="mt-1">
          มีคำถาม?{' '}
          <a href="mailto:support@chabapos.com" className="text-violet-400 hover:text-violet-300 underline">
            ติดต่อทีมงาน
          </a>
        </p>
      </div>

    </div>
  );
}
