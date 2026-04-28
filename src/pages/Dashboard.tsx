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
  Settings,
  Menu,
  QrCode
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import KitchenManagement from './dashboard/KitchenManagement';
import KitchenDisplay from './dashboard/KitchenDisplay';
import MenuManagement from './dashboard/MenuManagement';
import OptionManagement from './dashboard/OptionManagement';
import TableManagement from './dashboard/TableManagement';
import StaffOrdering from './dashboard/StaffOrdering';
import CounterService from './dashboard/CounterService';
import Overview from './dashboard/Overview';
import Payment from './dashboard/Payment';
import BranchSettings from './dashboard/BranchSettings';
import { auth } from '../lib/firebase';

export default function Dashboard() {
  const { brandId, branchId } = useParams<{ brandId: string, branchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const navItems = [
    { name: 'ภาพรวม', path: '', icon: LayoutDashboard },
    { name: 'เคาน์เตอร์ (จ่ายทันที)', path: 'counter-service', icon: QrCode },
    { name: 'หน้าจอครัว', path: 'kitchen-display', icon: ChefHat },
    { name: 'การชำระเงิน', path: 'payment', icon: Banknote },
    { name: 'ออเดอร์จากพนักงาน', path: 'staff-order', icon: UtensilsCrossed, hidden: true },
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
    <div className="flex h-screen bg-slate-50 overflow-hidden max-w-full">
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
        "hidden lg:flex bg-white border-r border-slate-200 flex-col transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 hover:text-primary shadow-sm z-10 transition-transform duration-300"
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
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="counter-service" element={<CounterService />} />
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

function SidebarContent({ brandId, branchId, location, navItems, handleLogout, isCollapsed = false }: any) {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className={cn("border-b border-slate-200 shrink-0", isCollapsed ? "p-4" : "p-6")}>
        <Link to={`/brands/${brandId}/branches`} className="flex items-center text-slate-500 hover:text-primary transition-colors mb-4 truncate">
          <ChevronLeft className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium ml-1">กลับไปหน้าสาขา</span>}
        </Link>
        <h2 className={cn(
          "font-bold text-primary tracking-tighter italic truncate transition-all",
          isCollapsed ? "text-lg text-center" : "text-xl"
        )}>
          {isCollapsed ? "CP" : "ChabaPOS"}
        </h2>
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
                "flex items-center text-sm font-bold rounded-xl transition-all h-12 truncate",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                isCollapsed ? "justify-center px-0" : "px-4"
              )}
              title={item.name}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-slate-400", isCollapsed ? "" : "mr-3")} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-slate-200 mt-auto shrink-0", isCollapsed ? "p-2" : "p-4")}>
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center w-full h-12 text-sm font-bold text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all truncate",
            isCollapsed ? "justify-center px-0" : "px-4"
          )}
          title="ออกจากระบบ"
        >
          <LogOut className={cn("w-5 h-5 shrink-0 group-hover:text-red-500", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span className="truncate">ออกจากระบบ</span>}
        </button>
      </div>
    </div>
  );
}
