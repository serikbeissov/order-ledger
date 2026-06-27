// Проверка прав на фронте — ТОЛЬКО для скрытия UI.
// Авторитетная проверка прав всегда на бэкенде (CLAUDE.md §3.3, §10).

export type Role = "admin" | "manager" | "staff" | null;

export interface CurrentUser {
  id: number;
  username: string;
  role: Role;
  is_superuser: boolean;
}

export function isAdmin(user?: CurrentUser | null): boolean {
  return user?.role === "admin";
}

export function isManagerOrAdmin(user?: CurrentUser | null): boolean {
  return user?.role === "admin" || user?.role === "manager";
}

/** Сотрудник не видит дашборд, расходы, инвестиции, резервы и удаление (§3.3). */
export function canSeeFinance(user?: CurrentUser | null): boolean {
  return isManagerOrAdmin(user);
}
