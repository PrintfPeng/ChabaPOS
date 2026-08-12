import React from 'react';
import { Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { Store, Tags, Package } from 'lucide-react';

import Suppliers from './Suppliers';
import Categories from './Categories';
import Materials from './Materials';

/**
 * "ตั้งค่าจัดการคลังสินค้า" — groups the three inventory master-data screens.
 * Ordered by the setup workflow the user must follow:
 *   1. ซัพพลายเออร์ (supplier)  → who you buy from
 *   2. หมวดหมู่ (category)       → how materials are grouped
 *   3. วัตถุดิบ (material)       → the raw materials themselves (needs 1 & 2 first)
 */
export default function InventorySettings() {
  const location = useLocation();
  const { brandId, branchId } = useParams();
  const basePath = `/brands/${brandId}/branches/${branchId}/inventory/settings`;

  const subTabs = [
    { name: 'ซัพพลายเออร์', path: '',           icon: Store,   step: 1 },
    { name: 'หมวดหมู่',     path: '/categories', icon: Tags,    step: 2 },
    { name: 'วัตถุดิบ',      path: '/materials',  icon: Package, step: 3 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-slate-900">ตั้งค่าจัดการคลังสินค้า</h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          ตั้งค่าข้อมูลพื้นฐานตามลำดับ: สร้างซัพพลายเออร์ → หมวดหมู่ → วัตถุดิบ
        </p>
      </div>

      {/* Sub-tabs (ordered by setup workflow) */}
      <div className="flex overflow-x-auto no-scrollbar gap-2">
        {subTabs.map((tab) => {
          const fullPath = `${basePath}${tab.path}`;
          const isActive = location.pathname === fullPath || location.pathname === fullPath + '/';
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              to={fullPath}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all',
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-200',
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400',
                )}
              >
                {tab.step}
              </span>
              <Icon className="w-4 h-4 shrink-0" />
              {tab.name}
            </Link>
          );
        })}
      </div>

      <Routes>
        <Route index element={<Suppliers />} />
        <Route path="categories" element={<Categories />} />
        <Route path="materials" element={<Materials />} />
      </Routes>
    </div>
  );
}
