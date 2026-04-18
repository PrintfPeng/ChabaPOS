import React from 'react';
import { Routes, Route, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Menu as MenuIcon, 
  Settings2, 
  Table as TableIcon,
  ChevronLeft,
  LogOut,
  ChefHat,
  Banknote,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import KitchenManagement from './dashboard/KitchenManagement';
import KitchenDisplay from './dashboard/KitchenDisplay';
import MenuManagement from './dashboard/MenuManagement';
import OptionManagement from './dashboard/OptionManagement';
import TableManagement from './dashboard/TableManagement';
import StaffOrdering from './dashboard/StaffOrdering';
import Overview from './dashboard/Overview';
import Payment from './dashboard/Payment';
import BranchSettings from './dashboard/BranchSettings';
import { auth } from '../lib/firebase';

export default function Dashboard() {
  const { brandId, branchId } = useParams<{ brandId: string, branchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'ภาพรวม', path: '', icon: LayoutDashboard },
    { name: 'หน้าจอครัว', path: 'kitchen-display', icon: ChefHat },
    { name: 'การชำระเงิน', path: 'payment', icon: Banknote },
    { name: 'จัดการครัว', path: 'kitchens', icon: UtensilsCrossed },
    { name: 'เมนู', path: 'menu', icon: MenuIcon },
    { name: 'ตัวเลือกเสริม', path: 'options', icon: Settings2 },
    { name: 'โต๊ะ', path: 'tables', icon: TableIcon },
    { name: 'ตั้งค่าสาขา', path: 'settings', icon: Settings },
  ];

  const handleLogout = () => {
    auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <Link to={`/brands/${brandId}/branches`} className="flex items-center text-slate-500 hover:text-primary transition-colors mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">กลับไปหน้าสาขา</span>
          </Link>
          <h2 className="text-xl font-bold text-primary">ChabaPOS</h2>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const fullPath = `/brands/${brandId}/branches/${branchId}${item.path ? '/' + item.path : ''}`;
            const isActive = location.pathname === fullPath;
            
            return (
              <Link
                key={item.name}
                to={fullPath}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-primary text-white" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 mr-3", isActive ? "text-white" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-400 group-hover:text-red-600" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="kitchen-display" element={<KitchenDisplay />} />
            <Route path="kitchens" element={<KitchenManagement />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="options" element={<OptionManagement />} />
            <Route path="tables" element={<TableManagement />} />
            <Route path="payment" element={<Payment />} />
            <Route path="settings" element={<BranchSettings />} />
            <Route path="order/:tableId" element={<StaffOrdering />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
