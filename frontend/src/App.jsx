import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Branches from './pages/Branches';
import Users from './pages/Users';
import Warehouses from './pages/Warehouses';
import { useT } from './hooks/useT';

function ProtectedRoute({ children, titleKey = '' }) {
  const t = useT();
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return <Layout title={titleKey ? t(titleKey) : ''}>{children}</Layout>;
}

function Page({ titleKey }) {
  const t = useT();
  return <div style={{ color: 'var(--text)', fontSize: '15px' }}>{t(titleKey)}</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"                    element={<ProtectedRoute titleKey="nav.dashboard"><Page titleKey="nav.dashboard" /></ProtectedRoute>} />
      <Route path="/requests"            element={<ProtectedRoute titleKey="nav.requests"><Page titleKey="nav.requests" /></ProtectedRoute>} />
      <Route path="/transfers"           element={<ProtectedRoute titleKey="nav.transfers"><Page titleKey="nav.transfers" /></ProtectedRoute>} />
      <Route path="/inventory"           element={<ProtectedRoute titleKey="nav.inventory"><Page titleKey="nav.inventory" /></ProtectedRoute>} />
      <Route path="/shipments"           element={<ProtectedRoute titleKey="nav.shipments"><Page titleKey="nav.shipments" /></ProtectedRoute>} />
      <Route path="/returns"             element={<ProtectedRoute titleKey="nav.returns"><Page titleKey="nav.returns" /></ProtectedRoute>} />
      <Route path="/reports"             element={<ProtectedRoute titleKey="nav.reports"><Page titleKey="nav.reports" /></ProtectedRoute>} />
      <Route path="/settings/products"   element={<ProtectedRoute titleKey="nav.products"><Page titleKey="nav.products" /></ProtectedRoute>} />
      <Route path="/settings/categories" element={<ProtectedRoute titleKey="nav.categories"><Page titleKey="nav.categories" /></ProtectedRoute>} />
      <Route path="/settings/merchants"  element={<ProtectedRoute titleKey="label.merchant"><Page titleKey="label.merchant" /></ProtectedRoute>} />
      <Route path="/settings/warehouses" element={<ProtectedRoute titleKey="nav.warehouses"><Warehouses /></ProtectedRoute>} />
      <Route path="/settings/branches"   element={<ProtectedRoute titleKey="nav.branches"><Branches /></ProtectedRoute>} />
      <Route path="/settings/users"      element={<ProtectedRoute titleKey="nav.users"><Users /></ProtectedRoute>} />
      <Route path="/notifications"       element={<ProtectedRoute titleKey="nav.notifications"><Page titleKey="nav.notifications" /></ProtectedRoute>} />
    </Routes>
  );
}
