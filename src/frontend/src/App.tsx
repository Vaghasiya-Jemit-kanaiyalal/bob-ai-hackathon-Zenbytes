import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"              element={<Dashboard />}    />
          <Route path="/fleet"         element={<Fleet />}        />
          <Route path="/fleet/:id"     element={<VehicleDetail />}/>
          <Route path="/routes"        element={<RoutesPage />}   />
          <Route path="/routes/:id"    element={<RouteDetail />}  />
          <Route path="/trips"         element={<Trips />}        />
          <Route path="/trips/:id"     element={<TripDetail />}   />
          <Route path="/analytics"     element={<Analytics />}    />
          <Route path="/copilot"       element={<Copilot />}      />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
