import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { FeatureProvider } from './contexts/FeatureContext';
import { PrinterProvider } from './context/PrinterContext';
import { Toaster } from './components/ui/sonner';
import Auth from './pages/Auth';
import BrandSelection from './pages/BrandSelection';
import BranchSelection from './pages/BranchSelection';
import Dashboard from './pages/Dashboard';
import CustomerOrder from './pages/CustomerOrder';
import OrderSuccess from './pages/OrderSuccess';
import KitchenDisplay from './pages/dashboard/KitchenDisplay';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import TenantManagement from './pages/superadmin/TenantManagement';
import BillingManagement from './pages/superadmin/BillingManagement';
import BroadcastMessage from './pages/superadmin/BroadcastMessage';
import PlanManagement from './pages/superadmin/PlanManagement';
import SystemSettings from './pages/superadmin/SystemSettings';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import Landing from './pages/Landing';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">กำลังโหลด...</div>;
  return user ? <>{children}</> : <Navigate to="/auth" />;
};

/** Only SUPER_ADMIN may access — everyone else is sent back to /auth */
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">กำลังโหลด...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/brands" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <FeatureProvider>
        <PrinterProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/order/:branchId/:tableId" element={<CustomerOrder />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route 
              path="/brands" 
            element={
              <PrivateRoute>
                <BrandSelection />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/brands/:brandId/branches" 
            element={
              <PrivateRoute>
                <BranchSelection />
              </PrivateRoute>
            } 
          />
          {/* KDS runs full-screen — must be declared before the Dashboard wildcard */}
          <Route
            path="/brands/:brandId/branches/:branchId/kitchen-display"
            element={
              <PrivateRoute>
                <KitchenDisplay />
              </PrivateRoute>
            }
          />
          {/* Super Admin — standalone layout, no tenant sidebar */}
          <Route
            path="/super-admin"
            element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="tenants"   element={<TenantManagement />} />
            <Route path="plans"     element={<PlanManagement />} />
            <Route path="billing"   element={<BillingManagement />} />
            <Route path="broadcast" element={<BroadcastMessage />} />
            <Route path="settings"  element={<SystemSettings />} />
          </Route>
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/checkout"
            element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            }
          />
          <Route
            path="/brands/:brandId/branches/:branchId/*"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Landing />} />
        </Routes>
      </Router>
        </PrinterProvider>
        </FeatureProvider>
        </CartProvider>
      <Toaster />
    </AuthProvider>
  );
}
