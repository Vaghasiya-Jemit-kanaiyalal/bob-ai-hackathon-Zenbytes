import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import VehicleDetail from './pages/VehicleDetail';
import RoutesPage from './pages/Routes';
import RouteDetail from './pages/RouteDetail';
import Trips from './pages/Trips';
import TripDetail from './pages/TripDetail';
import Analytics from './pages/Analytics';
import Copilot from './pages/Copilot';
import DataCenter from './pages/DataCenter';
import Login from './pages/Login';
import Register from './pages/Register';

// ─── Guard — redirect to /login if not authenticated ─────────────────────────
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--text-muted)', fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — wrapped in Layout */}
          <Route element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }>
            <Route path="/"              element={<Dashboard />}    />
            <Route path="/fleet"         element={<Fleet />}        />
            <Route path="/fleet/:id"     element={<VehicleDetail />}/>
            <Route path="/routes"        element={<RoutesPage />}   />
            <Route path="/routes/:id"    element={<RouteDetail />}  />
            <Route path="/trips"         element={<Trips />}        />
            <Route path="/trips/:id"     element={<TripDetail />}   />
            <Route path="/analytics"     element={<Analytics />}    />
            <Route path="/copilot"       element={<Copilot />}      />
            <Route path="/data-center"   element={<DataCenter />}   />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
