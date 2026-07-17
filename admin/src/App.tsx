import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Drivers from './pages/Drivers';
import LiveMap from './pages/LiveMap';
import Rides from './pages/Rides';
import Payments from './pages/Payments';
import KycVerification from './pages/KycVerification';
import Settings from './pages/Settings';
import PromoCodes from './pages/PromoCodes';
import Reports from './pages/Reports';
import WalletPayouts from './pages/WalletPayouts';
import Notifications from './pages/Notifications';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="live-map" element={<LiveMap />} />
        <Route path="rides" element={<Rides />} />
        <Route path="payments" element={<Payments />} />
        <Route path="kyc" element={<KycVerification />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="promo-codes" element={<PromoCodes />} />
        <Route path="wallet-payouts" element={<WalletPayouts />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
