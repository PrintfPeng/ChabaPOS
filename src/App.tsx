import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Auth from './pages/Auth';
import BrandSelection from './pages/BrandSelection';
import BranchSelection from './pages/BranchSelection';
import Dashboard from './pages/Dashboard';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">กำลังโหลด...</div>;
  return user ? <>{children}</> : <Navigate to="/auth" />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
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
          <Route 
            path="/brands/:brandId/branches/:branchId/*" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/brands" />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}
