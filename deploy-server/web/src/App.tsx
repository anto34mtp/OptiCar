import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import VehiclesPage from './pages/vehicles/VehiclesPage';
import VehicleDetailPage from './pages/vehicles/VehicleDetailPage';
import AddRefuelPage from './pages/refuels/AddRefuelPage';
import StatsPage from './pages/stats/StatsPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import VehicleMaintenancePage from './pages/maintenance/VehicleMaintenancePage';
import AddMaintenancePage from './pages/maintenance/AddMaintenancePage';
import MaintenanceRulesPage from './pages/maintenance/MaintenanceRulesPage';
import TotalCostsPage from './pages/costs/TotalCostsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="refuel/new" element={<AddRefuelPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="maintenance/:vehicleId" element={<VehicleMaintenancePage />} />
        <Route path="maintenance/:vehicleId/add" element={<AddMaintenancePage />} />
        <Route path="maintenance/:vehicleId/rules" element={<MaintenanceRulesPage />} />
        <Route path="costs" element={<TotalCostsPage />} />
      </Route>
    </Routes>
  );
}
