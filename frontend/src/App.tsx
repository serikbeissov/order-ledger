import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./api/auth";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import { canSeeFinance, isAdmin } from "./lib/permissions";
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

  const financeOk = canSeeFinance(user);
  const adminOk = isAdmin(user);

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={financeOk ? <DashboardPage /> : <Navigate to="/clients" replace />}
        />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/warehouse" element={<WarehousePage />} />
        {financeOk && <Route path="/expenses" element={<ExpensesPage />} />}
        {financeOk && <Route path="/investments" element={<InvestmentsPage />} />}
        {financeOk && <Route path="/reserves" element={<ReservesPage />} />}
        {adminOk && <Route path="/users" element={<UsersPage />} />}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
