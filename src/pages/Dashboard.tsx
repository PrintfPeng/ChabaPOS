import React, { useEffect } from 'react';
import { Routes, Route, Link, useParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import api from '../lib/api';
import { ChevronLeft, LogOut, Menu, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import TableManagement from './dashboard/TableManagement';
import StaffOrdering from './dashboard/StaffOrdering';
import CounterService from './dashboard/CounterService';
import DeliveryService from './dashboard/DeliveryService';
import Overview from './dashboard/Overview';
import Payment from './dashboard/Payment';
import BranchSettings from './dashboard/BranchSettings';
import InventoryLayout from './dashboard/inventory/InventoryLayout';
import Reports from './dashboard/Reports';
import MarketingPage from './dashboard/MarketingPage';
import KitchenDisplay from './dashboard/KitchenDisplay';
import { auth } from '../lib/firebase';
import { NAV_ITEMS, FEATURES } from '../lib/feature-config';
import { useFeature } from '../contexts/FeatureContext';
import { UpgradePlanModal } from '../components/UpgradePlanModal';
import { FeatureGuard } from '../components/FeatureGuard';

export default function Dashboard() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [lockedFeature, setLockedFeature] = React.useState<string | null>(null);
  const { hasFeature, setAllowedFeatures } = useFeature();

  // ── Load plan features for this brand ───────────────────────────────────
  useEffect(() => {
    if (!brandId) return;

    api.get(`/brands/${brandId}`)
      .then(res => {
        const features: string[] = Array.isArray(res.data.plan?.features)
          ? (res.data.plan.features as string[])
          : [];
        console.log('Allowed Features:', features);
        setAllowedFeatures(features);
      })
      .catch(err => {
        console.error('[FeatureFlag] Failed to load brand plan features:', err);
        setAllowedFeatures([]);
      });

    // Reset to locked state when leaving this brand's dashboard
    return () => { setAllowedFeatures([]); };
  }, [brandId, setAllowedFeatures]);

  const handleLogout = () => {
    auth.signOut();
    navigate('/auth');
  };

  const sidebarProps = {
    brandId,
    branchId,
    location,
    hasFeature,
    onLockedClick: setLockedFeature,
    handleLogout,
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
            <SidebarContent {...sidebarProps} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex bg-white border-r border-red-100/60 flex-col transition-all duration-300 relative shadow-[2px_0_20px_rgb(0,0,0,0.04)] print:hidden",
        isCollapsed ? "w-20" : "w-64",
      )}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-white border border-red-100 rounded-full p-1 hover:text-primary shadow-md z-10 transition-transform duration-300"
          style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <SidebarContent {...sidebarProps} isCollapsed={isCollapsed} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0 print:overflow-visible print:h-auto print:block">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible print:block">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="counter-service" element={<CounterService />} />
            <Route path="tables"          element={<TableManagement />} />
            <Route path="payment"         element={<Payment />} />
            <Route path="settings"        element={<BranchSettings />} />

            {/* Feature-gated routes — redirect to overview if plan lacks the key */}
            <Route path="inventory/*" element={
              <FeatureGuard featureKey={FEATURES.INVENTORY}>
                <InventoryLayout />
              </FeatureGuard>
            } />
            <Route path="marketing" element={
              <FeatureGuard featureKey={FEATURES.MARKETING}>
                <MarketingPage />
              </FeatureGuard>
            } />
            <Route path="delivery-service" element={
              <FeatureGuard featureKey={FEATURES.DELIVERY}>
                <DeliveryService />
              </FeatureGuard>
            } />

            {/* Legacy redirects */}
            <Route path="kitchens"   element={<Navigate to="../settings?tab=kitchens" replace />} />
            <Route path="menu"       element={<Navigate to="../settings?tab=menus"    replace />} />
            <Route path="options"    element={<Navigate to="../settings?tab=options"  replace />} />
            <Route path="members"    element={<Navigate to="../marketing?tab=members"     replace />} />
            <Route path="promotions" element={<Navigate to="../marketing?tab=promotions"  replace />} />

            {/* Hidden / internal routes */}
            <Route path="reports"          element={<Reports />} />
            <Route path="kitchen-display"  element={<KitchenDisplay />} />
            <Route path="order/:tableId"   element={<StaffOrdering />} />
          </Routes>
        </div>
      </main>

      {/* Upgrade modal — triggered by clicking a locked nav item */}
      <UpgradePlanModal
        open={!!lockedFeature}
        featureName={lockedFeature ?? ''}
        onClose={() => setLockedFeature(null)}
      />
    </div>
  );
}

// ── SidebarContent ────────────────────────────────────────────────────────────

interface SidebarProps {
  brandId?: string;
  branchId?: string;
  location: ReturnType<typeof useLocation>;
  hasFeature: (key: string) => boolean;
  onLockedClick: (featureName: string) => void;
  handleLogout: () => void;
  isCollapsed?: boolean;
}

function SidebarContent({
  brandId, branchId, location,
  hasFeature, onLockedClick, handleLogout,
  isCollapsed = false,
}: SidebarProps) {
  const { allowedFeatures } = useFeature();
  // TODO: remove after debugging
  console.log('Allowed Features:', allowedFeatures);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Header */}
      <div className={cn("border-b border-slate-200 shrink-0", isCollapsed ? "p-4" : "p-6")}>
        <Link
          to={`/brands/${brandId}/branches`}
          className="flex items-center text-slate-400 hover:text-primary transition-colors mb-5 truncate group"
        >
          <ChevronLeft className="w-4 h-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
          {!isCollapsed && <span className="text-xs font-semibold ml-1 tracking-wide">กลับไปหน้าสาขา</span>}
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-black">N</span>
          </div>
          {!isCollapsed
            ? <h2 className="font-black text-xl text-slate-900 tracking-tight">Nex<span className="text-primary">OS</span></h2>
            : <h2 className="font-black text-lg text-primary tracking-tighter">N</h2>
          }
        </div>
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto no-scrollbar", isCollapsed ? "p-2" : "p-4")}>
        {NAV_ITEMS.map((item) => {
          const isLocked = !!item.featureKey && !hasFeature(item.featureKey);

          const [basePath, searchStr] = item.path.split('?');
          const itemFullPath = `/brands/${brandId}/branches/${branchId}${basePath ? '/' + basePath : ''}`;
          const fullPath    = `/brands/${brandId}/branches/${branchId}${item.path ? '/' + item.path : ''}`;

          let isActive = false;
          if (searchStr) {
            isActive = location.pathname === itemFullPath && location.search === `?${searchStr}`;
          } else if (item.path === 'settings') {
            isActive = location.pathname === itemFullPath && !location.search.includes('tab=');
          } else {
            isActive = location.pathname === itemFullPath;
          }

          // ── Locked: show disabled button + lock badge ─────────────────────
          if (isLocked) {
            return (
              <button
                key={item.name}
                onClick={() => onLockedClick(item.name)}
                title={isCollapsed ? `${item.name} — ต้องการแพ็กเกจสูงกว่า` : undefined}
                className={cn(
                  "relative flex items-center text-sm font-semibold rounded-xl h-11 w-full",
                  "text-slate-300 hover:bg-slate-50 transition-all duration-200",
                  isCollapsed ? "justify-center px-0" : "pl-4 pr-2",
                )}
              >
                <item.icon className={cn(
                  "w-[18px] h-[18px] shrink-0 text-slate-300",
                  !isCollapsed && "mr-3",
                )} />

                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{item.name}</span>
                    <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0 mr-1.5" />
                    <span className="shrink-0 text-[9px] font-black text-violet-500 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                      Pro
                    </span>
                  </>
                )}

                {/* Collapsed: tiny lock badge at corner */}
                {isCollapsed && (
                  <Lock className="absolute bottom-1 right-1.5 w-2.5 h-2.5 text-violet-400" />
                )}
              </button>
            );
          }

          // ── Unlocked: normal Link ──────────────────────────────────────────
          return (
            <Link
              key={item.name}
              to={fullPath}
              className={cn(
                "flex items-center text-sm font-semibold rounded-xl transition-all duration-200 h-11 truncate",
                isActive
                  ? "bg-gradient-to-r from-red-50 to-transparent text-primary border-l-4 border-primary pl-3"
                  : "text-slate-500 hover:bg-red-50/40 hover:text-slate-800 pl-4",
                isCollapsed ? "justify-center px-0 border-l-0" : "",
              )}
              title={item.name}
            >
              <item.icon className={cn(
                "w-[18px] h-[18px] shrink-0 transition-colors",
                isActive ? "text-primary" : "text-slate-400",
                isCollapsed ? "" : "mr-3",
              )} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={cn("border-t border-slate-200 mt-auto shrink-0", isCollapsed ? "p-2" : "p-4")}>
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center w-full h-11 text-sm font-semibold text-slate-400 rounded-xl hover:bg-red-50 hover:text-primary transition-all duration-200 truncate group",
            isCollapsed ? "justify-center px-0" : "px-4",
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
