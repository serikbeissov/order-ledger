import { NavLink, useNavigate } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "@/api/auth";
import { canSeeFinance, isAdmin } from "@/lib/permissions";
import { clsx } from "clsx";

interface NavItem {
  to: string;
  label: string;
  show: (financeOk: boolean, adminOk: boolean) => boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Дашборд", show: (f) => f },
  { to: "/clients", label: "Клиенты", show: () => true },
  { to: "/orders", label: "Заказы", show: () => true },
  { to: "/warehouse", label: "Склад", show: () => true },
  { to: "/expenses", label: "Расходы", show: (f) => f },
  { to: "/investments", label: "Инвестиции", show: (f) => f },
  { to: "/reserves", label: "Резервы", show: (f) => f },
  { to: "/users", label: "Пользователи", show: (_f, a) => a },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const financeOk = canSeeFinance(user);
  const adminOk = isAdmin(user);
  const brand = "Maison"; // отображаемый бренд инстанса

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="text-lg font-bold tracking-tight text-brand">{brand}</div>
          <div className="text-xs text-gray-400">order-ledger</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.filter((i) => i.show(financeOk, adminOk)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-brand text-white"
                    : "text-gray-600 hover:bg-gray-100",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3 text-sm">
          <div className="px-2 text-gray-700">{user?.username}</div>
          <div className="px-2 text-xs text-gray-400">{user?.role}</div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-gray-500 hover:bg-gray-100"
          >
            Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden bg-gray-50 p-6">{children}</main>
    </div>
  );
}
