"""
Роли реализованы через Django Groups (CLAUDE.md §3.3).

- admin   — видит всё, управляет пользователями и системой;
- manager — вся операционка + дашборд/P&L, без управления пользователями;
- staff   — клиенты и заказы, без финансового дашборда, расходов и удаления.
"""

ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_STAFF = "staff"

ROLE_GROUPS = {
    ROLE_ADMIN: "Администратор",
    ROLE_MANAGER: "Менеджер",
    ROLE_STAFF: "Сотрудник",
}


def user_role(user) -> str | None:
    """Вернуть код роли пользователя (по группам). Суперюзер → admin."""
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return ROLE_ADMIN
    names = set(user.groups.values_list("name", flat=True))
    for code, title in ROLE_GROUPS.items():
        if title in names or code in names:
            return code
    return None


def is_admin(user) -> bool:
    return user_role(user) == ROLE_ADMIN


def is_manager_or_admin(user) -> bool:
    return user_role(user) in (ROLE_ADMIN, ROLE_MANAGER)
