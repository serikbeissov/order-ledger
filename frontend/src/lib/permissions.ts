// Проверка прав на фронте — ТОЛЬКО для скрытия UI.
// Авторитетная проверка прав всегда на бэкенде (CLAUDE.md §3.3, §10).
// Видимость раздела = view_<model>, действия = add_/change_/delete_<model>.

export type Role = "admin" | "manager" | "staff" | null;

export interface GroupRef {
  id: number;
  name: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_active?: boolean;
  role: Role;
  is_superuser: boolean;
  groups: GroupRef[];
  permissions: string[]; // ["app.codename", …] — эффективные (роль + личные)
}

/** Есть ли у пользователя право `app.codename`. Суперпользователь — всегда да. */
export function hasPerm(user: CurrentUser | null | undefined, perm: string): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  return user.permissions?.includes(perm) ?? false;
}

/** Управление пользователями и ролями (раздел «Пользователи»/«Роли»). */
export function canManageUsers(user?: CurrentUser | null): boolean {
  return hasPerm(user, "auth.change_user") || hasPerm(user, "auth.add_user");
}

// Права видимости разделов (соответствуют моделям бэкенда).
export const PERM = {
  dashboard: "dashboard.view_dashboard",
  clients: "clients.view_client",
  orders: "orders.view_order",
  warehouse: "warehouse.view_warehouseitem",
  expenses: "expenses.view_expense",
  investments: "finance.view_investment",
  reserves: "finance.view_reserve",
} as const;
