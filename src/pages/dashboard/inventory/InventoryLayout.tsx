import React from 'react';
import { Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import { cn } from '../../../lib/utils';

import InventoryDashboard from './InventoryDashboard';
import Suppliers from './Suppliers';
import Categories from './Categories';
import Materials from './Materials';
import CreatePurchaseOrder from './CreatePurchaseOrder';
import Expenses from './Expenses';

export default function InventoryLayout() {
  const location = useLocation();
  const { brandId, branchId } = useParams();
  const basePath = `/brands/${brandId}/branches/${branchId}/inventory`;

  const tabs = [
    { name: 'ภาพรวม', path: '' },
    { name: 'สั่งซื้อวัตถุดิบ', path: '/purchase-orders/create' },
    { name: 'วัตถุดิบ', path: '/materials' },
    { name: 'หมวดหมู่', path: '/categories' },
    { name: 'ซัพพลายเออร์', path: '/suppliers' },
    { name: 'รายจ่าย', path: '/expenses' },
  ];

  return (
    <div className="space-y-6 max-w-full overflow-hidden flex flex-col h-full">
      <div className="flex flex-col gap-4 px-1 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">จัดการคลังสินค้า</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">บริหารจัดการวัตถุดิบและการสั่งซื้อ</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
          {tabs.map((tab) => {
            const fullPath = `${basePath}${tab.path}`;
            const isActive = location.pathname === fullPath || location.pathname === fullPath + '/';
            return (
              <Link
                key={tab.name}
                to={fullPath}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-200"
                )}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <Routes>
          <Route index element={<InventoryDashboard />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="categories" element={<Categories />} />
          <Route path="materials" element={<Materials />} />
          <Route path="purchase-orders/create" element={<CreatePurchaseOrder />} />
          <Route path="expenses" element={<Expenses />} />
        </Routes>
      </div>
    </div>
  );
}
