import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, Building2, CreditCard, Megaphone,
  LogOut, Shield, Menu, X, ChevronLeft, Package, Settings,
} from 'lucide-react';

const NAV = [
  { label: 'ภาพรวม',                path: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'จัดการร้านค้า',          path: '/super-admin/tenants',   icon: Building2 },
  { label: 'จัดการแพ็กเกจ',          path: '/super-admin/plans',     icon: Package },
  { label: 'Subscription & Billing', path: '/super-admin/billing',    icon: CreditCard },
  { label: 'ประกาศแจ้งเตือน',        path: '/super-admin/broadcast',  icon: Megaphone },
  { label: 'ตั้งค่าระบบ',             path: '/super-admin/settings',   icon: Settings },
];

function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-white text-sm leading-none">Super Admin</p>
            <p className="text-[10px] text-slate-500 mt-0.5">ChabaPOS Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.14em] px-3 pb-2.5">
          เมนูหลัก
        </p>
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
              isActive
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white',
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700/60 space-y-0.5">
        <button
          onClick={() => { navigate('/brands'); onItemClick?.(); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </button>
        <button
          onClick={() => { navigate('/auth'); onItemClick?.(); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-slate-900 flex-col shrink-0">
        <SidebarNav />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 flex flex-col lg:hidden shadow-2xl">
            <div className="flex items-center justify-end px-4 pt-3 pb-1">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarNav onItemClick={() => setMobileOpen(false)} />
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-600" />
            <p className="font-black text-sm text-slate-800">Super Admin</p>
          </div>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
