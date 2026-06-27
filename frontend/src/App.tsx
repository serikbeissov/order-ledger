import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./api/auth";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import { canManageUsers, hasPerm, PERM } from "./lib/permissions";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import WarehousePage from "./pages/WarehousePage";
import ExpensesPage from "./pages/ExpensesPage";
import InvestmentsPage from "./pages/InvestmentsPage";
import ReservesPage from "./pages/ReservesPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Первый доступный раздел — куда отправлять с «/», если нет дашборда.
  const landing =
    (hasPerm(user, PERM.dashboard) && "/") ||
    (hasPerm(user, PERM.clients) && "/clients") ||
    (hasPerm(user, PERM.orders) && "/orders") ||
    (hasPerm(user, PERM.warehouse) && "/warehouse") ||
    (canManageUsers(user) && "/users") ||
    "/clients";

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            hasPerm(user, PERM.dashboard) ? (
              <DashboardPage />
            ) : (
              <Navigate to={landing === "/" ? "/clients" : landing} replace />
            )
          }
        />
        {hasPerm(user, PERM.clients) && (
          <Route path="/clients" element={<ClientsPage />} />
        )}
        {hasPerm(user, PERM.clients) && (
          <Route path="/clients/:id" element={<ClientDetailPage />} />
        )}
        {hasPerm(user, PERM.orders) && <Route path="/orders" element={<OrdersPage />} />}
        {hasPerm(user, PERM.orders) && (
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        )}
        {hasPerm(user, PERM.warehouse) && (
          <Route path="/warehouse" element={<WarehousePage />} />
        )}
        {hasPerm(user, PERM.expenses) && (
          <Route path="/expenses" element={<ExpensesPage />} />
        )}
        {hasPerm(user, PERM.investments) && (
          <Route path="/investments" element={<InvestmentsPage />} />
        )}
        {hasPerm(user, PERM.reserves) && (
          <Route path="/reserves" element={<ReservesPage />} />
        )}
        {canManageUsers(user) && <Route path="/users" element={<UsersPage />} />}
        {canManageUsers(user) && <Route path="/roles" element={<RolesPage />} />}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
