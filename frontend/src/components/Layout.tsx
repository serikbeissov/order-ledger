import { NavLink, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/api/auth";
import { useRecurringDue } from "@/api/hooks";
import { canManageUsers, hasPerm, PERM, type CurrentUser } from "@/lib/permissions";
import { clsx } from "clsx";

interface NavItem {
  to: string;
  label: string;
  show: (u: CurrentUser | null) => boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Дашборд", show: (u) => hasPerm(u, PERM.dashboard) },
  { to: "/clients", label: "Клиенты", show: (u) => hasPerm(u, PERM.clients) },
  { to: "/orders", label: "Заказы", show: (u) => hasPerm(u, PERM.orders) },
  { to: "/warehouse", label: "Склад", show: (u) => hasPerm(u, PERM.warehouse) },
  { to: "/expenses", label: "Расходы", show: (u) => hasPerm(u, PERM.expenses) },
  { to: "/investments", label: "Инвестиции", show: (u) => hasPerm(u, PERM.investments) },
  { to: "/reserves", label: "Резервы", show: (u) => hasPerm(u, PERM.reserves) },
  { to: "/reports", label: "Отчёты", show: (u) => hasPerm(u, PERM.dashboard) },
  { to: "/users", label: "Пользователи", show: (u) => canManageUsers(u) },
  { to: "/roles", label: "Роли и права", show: (u) => canManageUsers(u) },
  { to: "/audit", label: "Аудит", show: (u) => canManageUsers(u) },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const brand = "Maison"; // отображаемый бренд инстанса

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV.filter((i) => i.show(user)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={() => setDrawer(false)}
          className={({ isActive }) =>
            clsx(
              "block rounded-lg px-3 py-2 text-sm font-medium",
              isActive ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  const footer = (
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
  );

  const head = (
    <div className="border-b border-gray-100 px-5 py-4">
      <div className="font-display text-lg font-bold tracking-tight text-brand">{brand}</div>
      <div className="text-xs text-slate">order-ledger</div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Десктоп: постоянный сайдбар */}
      <aside className="hidden w-56 flex-col border-r border-gray-200 bg-white md:flex">
        {head}
        {nav}
        {footer}
      </aside>

      {/* Мобайл: выезжающий ящик */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            {head}
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Мобайл: верхняя панель с гамбургером */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <button
            onClick={() => setDrawer(true)}
            aria-label="Меню"
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-display font-bold text-brand">{brand}</span>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden bg-mist p-4 md:p-6">
          <RecurringReminder user={user} />
          {children}
        </main>
      </div>
    </div>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Напоминание записать ежемесячные расходы за текущий месяц. */
function RecurringReminder({ user }: { user: CurrentUser | null }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const canRecord = hasPerm(user, "expenses.add_expense");
  const period = currentMonth();
  const { data } = useRecurringDue(period);

  if (!canRecord || dismissed || !data || data.due.length === 0) return null;
  const monthLabel = new Date(`${period}-01`).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
      <div className="text-sm text-yellow-900">
        <div className="font-medium">Не выданы ежемесячные расходы за {monthLabel}</div>
        <div className="text-yellow-800">
          {data.due.map((d) => d.name).join(", ")}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => navigate("/expenses", { state: { openCreate: true } })}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-black"
        >
          Записать
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg px-2 py-1.5 text-sm text-yellow-700 hover:bg-yellow-100"
        >
          Позже
        </button>
      </div>
    </div>
  );
}
