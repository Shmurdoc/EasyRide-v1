import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/Toast';
import Layout from '@/components/Layout';
import LoginScreen from '@/pages/LoginScreen';
import DashboardScreen from '@/pages/DashboardScreen';
import RidesScreen from '@/pages/RidesScreen';
import DriversScreen from '@/pages/DriversScreen';
import UsersScreen from '@/pages/UsersScreen';
import PaymentsScreen from '@/pages/PaymentsScreen';
import PricingScreen from '@/pages/PricingScreen';
import ReportsScreen from '@/pages/ReportsScreen';
import SettingsScreen from '@/pages/SettingsScreen';
import LiveMapScreen from '@/pages/LiveMapScreen';
import FoodScreen from '@/pages/FoodScreen';
import PromoScreen from '@/pages/PromoScreen';
import ComplianceScreen from '@/pages/ComplianceScreen';
import AuditLogScreen from '@/pages/AuditLogScreen';
import DashboardPage from '@/pages/DashboardPage';
import DriversPage from '@/pages/DriversPage';
import PricingPage from '@/pages/PricingPage';
import RestaurantsPage from '@/pages/RestaurantsPage';
import FoodOrdersPage from '@/pages/FoodOrdersPage';
import AuditLogPage from '@/pages/AuditLogPage';
import PayoutsPage from '@/pages/PayoutsPage';
import FinancialDashboard from '@/pages/FinancialDashboard';
import NotificationManager from '@/pages/NotificationManager';
import NotFoundScreen from '@/pages/NotFoundScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardScreen />} />
            <Route path="rides" element={<RidesScreen />} />
            <Route path="drivers" element={<DriversScreen />} />
            <Route path="users" element={<UsersScreen />} />
            <Route path="payments" element={<PaymentsScreen />} />
            <Route path="pricing" element={<PricingScreen />} />
            <Route path="reports" element={<ReportsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="map" element={<LiveMapScreen />} />
            <Route path="food" element={<FoodScreen />} />
            <Route path="promo" element={<PromoScreen />} />
            <Route path="compliance" element={<ComplianceScreen />} />
            <Route path="audit" element={<AuditLogScreen />} />
            <Route path="restaurants" element={<RestaurantsPage />} />
            <Route path="food-orders" element={<FoodOrdersPage />} />
            <Route path="payouts" element={<PayoutsPage />} />
            <Route path="financial" element={<FinancialDashboard />} />
            <Route path="notifications" element={<NotificationManager />} />
          </Route>
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
