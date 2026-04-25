import { Routes, Route, Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

const Page = ({ name }) => <div>{name}</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Page name="Login" />} />
      <Route path="/" element={<ProtectedRoute><Page name="Dashboard" /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute><Page name="Requests" /></ProtectedRoute>} />
      <Route path="/transfers" element={<ProtectedRoute><Page name="Transfers" /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Page name="Inventory" /></ProtectedRoute>} />
      <Route path="/shipments" element={<ProtectedRoute><Page name="Shipments" /></ProtectedRoute>} />
      <Route path="/returns" element={<ProtectedRoute><Page name="Returns" /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Page name="Reports" /></ProtectedRoute>} />
      <Route path="/settings/products" element={<ProtectedRoute><Page name="Settings - Products" /></ProtectedRoute>} />
      <Route path="/settings/categories" element={<ProtectedRoute><Page name="Settings - Categories" /></ProtectedRoute>} />
      <Route path="/settings/merchants" element={<ProtectedRoute><Page name="Settings - Merchants" /></ProtectedRoute>} />
      <Route path="/settings/warehouses" element={<ProtectedRoute><Page name="Settings - Warehouses" /></ProtectedRoute>} />
      <Route path="/settings/branches" element={<ProtectedRoute><Page name="Settings - Branches" /></ProtectedRoute>} />
      <Route path="/settings/users" element={<ProtectedRoute><Page name="Settings - Users" /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Page name="Notifications" /></ProtectedRoute>} />
    </Routes>
  );
}
