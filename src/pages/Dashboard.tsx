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
  Banknote,
  Settings,
  Menu,
  QrCode,
  Package,
  BarChart3,
  Users,
  Gift,
  MonitorPlay,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import KitchenManagement from './dashboard/KitchenManagement';
import MenuManagement from './dashboard/MenuManagement';
import OptionManagement from './dashboard/OptionManagement';
import TableManagement from './dashboard/TableManagement';
import StaffOrdering from './dashboard/StaffOrdering';
import CounterService from './dashboard/CounterService';
import Overview from './dashboard/Overview';
import Payment from './dashboard/Payment';
import BranchSettings from './dashboard/BranchSettings';
import InventoryLayout from './dashboard/inventory/InventoryLayout';
import Reports from './dashboard/Reports';
import MembersPage from './dashboard/members/MembersPage';
import PromotionList from './dashboard/promotions/PromotionList';
import KitchenDisplay from './dashboard/KitchenDisplay';
import { auth } from '../lib/firebase';

export default function Dashboard() {
  const { brandId, branchId } = useParams<{ brandId: string, branchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const navItems = [
    { name: 'ภาพรวม', path: '', icon: LayoutDashboard },
    { name: 'สั่งอาหารแบบชำระทันที', path: 'counter-service', icon: QrCode },
    { name: 'เปิดโต๊ะสั่งอาหาร', path: 'tables', icon: TableIcon },
    { name: 'การชำระเงิน', path: 'payment', icon: Banknote },
    { name: 'จัดการครัว', path: 'kitchens', icon: UtensilsCrossed },
    { name: 'รายงานการขาย', path: 'reports', icon: BarChart3 },
    { name: 'เมนู', path: 'menu', icon: MenuIcon },
    { name: 'ตัวเลือกเสริม', path: 'options', icon: Settings2 },
    { name: 'จัดการคลังสินค้า', path: 'inventory', icon: Package },
    { name: 'สมาชิก',          path: 'members',    icon: Users        },
    { name: 'โปรโมชั่น',       path: 'promotions', icon: Gift         },
    { name: 'จอครัว (KDS)',    path: 'kitchen-display', icon: MonitorPlay },
    { name: 'ตั้งค่าสาขา', path: 'settings', icon: Settings },
    { name: 'ออเดอร์จากพนักงาน', path: 'staff-order', icon: UtensilsCrossed, hidden: true },
  ];

  const handleLogout = () => {
    auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-[oklch(0.985_0.002_20)] overflow-hidden max-w-full print:h-auto print:overflow-visible">
      {/* Mobile Nav Trigger */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Sheet>
          <SheetTrigger render={<Button size="icon" className="w-14 h-14 rounded-full shadow-2xl bg-primary text-white hover:bg-primary/90" />}>
            <Menu className="w-6 h-6" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarContent 
              brandId={brandId} 
              branchId={branchId} 
              location={location} 
              navItems={navItems} 
              handleLogout={handleLogout} 
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex bg-white border-r border-red-100/60 flex-col transition-all duration-300 relative shadow-[2px_0_20px_rgb(0,0,0,0.04)] print:hidden",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-white border border-red-100 rounded-full p-1 hover:text-primary shadow-md z-10 transition-transform duration-300"
          style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <SidebarContent 
          brandId={brandId} 
          branchId={branchId} 
          location={location} 
          navItems={navItems} 
          handleLogout={handleLogout} 
          isCollapsed={isCollapsed}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0 print:overflow-visible print:h-auto print:block">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible print:block">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="counter-service" element={<CounterService />} />
            <Route path="kitchens" element={<KitchenManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="options" element={<OptionManagement />} />
            <Route path="tables" element={<TableManagement />} />
            <Route path="payment" element={<Payment />} />
            <Route path="settings" element={<BranchSettings />} />
            <Route path="inventory/*" element={<InventoryLayout />} />
            <Route path="members"          element={<MembersPage />} />
            <Route path="promotions"       element={<PromotionList />} />
            <Route path="kitchen-display"  element={<KitchenDisplay />} />
            <Route path="order/:tableId" element={<StaffOrdering />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ brandId, branchId, location, navItems, handleLogout, isCollapsed = false }: any) {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className={cn("border-b border-slate-200 shrink-0", isCollapsed ? "p-4" : "p-6")}>
        <Link to={`/brands/${brandId}/branches`} className="flex items-center text-slate-400 hover:text-primary transition-colors mb-5 truncate group">
          <ChevronLeft className="w-4 h-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
          {!isCollapsed && <span className="text-xs font-semibold ml-1 tracking-wide">กลับไปหน้าสาขา</span>}
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-black">C</span>
          </div>
          {!isCollapsed && (
            <h2 className="font-black text-xl text-slate-900 tracking-tight">
              Chaba<span className="text-primary">POS</span>
            </h2>
          )}
          {isCollapsed && (
            <h2 className="font-black text-lg text-primary tracking-tighter">C</h2>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-1 overflow-y-auto no-scrollbar", isCollapsed ? "p-2" : "p-4")}>
        {navItems.filter((i: any) => !i.hidden).map((item: any) => {
          const fullPath = `/brands/${brandId}/branches/${branchId}${item.path ? '/' + item.path : ''}`;
          const isActive = location.pathname === fullPath;
          
          return (
            <Link
              key={item.name}
              to={fullPath}
              className={cn(
                "flex items-center text-sm font-semibold rounded-xl transition-all duration-200 h-11 truncate",
                isActive 
                  ? "bg-gradient-to-r from-red-50 to-transparent text-primary border-l-4 border-primary pl-3" 
                  : "text-slate-500 hover:bg-red-50/40 hover:text-slate-800 pl-4",
                isCollapsed ? "justify-center px-0 border-l-0" : ""
              )}
              title={item.name}
            >
              <item.icon className={cn(
                "w-[18px] h-[18px] shrink-0 transition-colors",
                isActive ? "text-primary" : "text-slate-400",
                isCollapsed ? "" : "mr-3"
              )} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-slate-200 mt-auto shrink-0", isCollapsed ? "p-2" : "p-4")}>
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center w-full h-11 text-sm font-semibold text-slate-400 rounded-xl hover:bg-red-50 hover:text-primary transition-all duration-200 truncate group",
            isCollapsed ? "justify-center px-0" : "px-4"
          )}
          title="ออกจากระบบ"
        >
          <LogOut className={cn("w-[18px] h-[18px] shrink-0 group-hover:text-primary transition-colors", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span className="truncate">ออกจากระบบ</span>}
        </button>
      </div>
    </div>
  );
}
