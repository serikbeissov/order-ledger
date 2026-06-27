"""
DRF-пермишены по ролям (CLAUDE.md §3.3).

Права проверяются на бэкенде; фронт лишь скрывает недоступное.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .roles import is_admin, is_manager_or_admin, user_role, ROLE_STAFF


class IsAdmin(BasePermission):
    """Только администратор (управление пользователями, системные настройки)."""

    message = "Доступно только администратору."

    def has_permission(self, request, view):
        return is_admin(request.user)


class IsManagerOrAdmin(BasePermission):
    """Менеджер или администратор (расходы, инвестиции, резервы, дашборд)."""

    message = "Доступно только менеджеру или администратору."

    def has_permission(self, request, view):
        return is_manager_or_admin(request.user)


class IsStaffNoDelete(BasePermission):
    """
    Операционный доступ для всех ролей, но сотрудник не может удалять/архивировать
    (DELETE запрещён сотруднику; чтение и изменение — разрешены).
    """

    message = "Сотрудник не может выполнять удаление."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "DELETE" and user_role(request.user) == ROLE_STAFF:
            return False
        return True
