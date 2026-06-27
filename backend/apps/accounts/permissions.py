"""
DRF-пермишены order-ledger (CLAUDE.md §3.3).

Доступ управляется реальными Django-правами (Groups + индивидуальные права):
что админ выдал роли/пользователю, то и доступно. Видимость раздела = право
`view_<model>`, действия = `add_/change_/delete_<model>`. Проверка — на бэкенде;
фронт лишь скрывает недоступное.
"""
from rest_framework.permissions import (
    SAFE_METHODS,
    BasePermission,
    DjangoModelPermissions,
)

from .roles import is_admin


class ConfigurableModelPermissions(DjangoModelPermissions):
    """
    Как DjangoModelPermissions, но **чтение (GET) тоже требует `view_<model>`** —
    чтобы видимость раздела управлялась правом, а не была открыта всем.

    Вложенные write-экшены вьюсета (movements, items, issue, returns, expenses и
    т.п.) проверяются здесь по HTTP-методу против модели вьюсета
    (POST→add_, PATCH/PUT→change_, DELETE→delete_).
    """

    perms_map = {
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": [],
        "POST": ["%(app_label)s.add_%(model_name)s"],
        "PUT": ["%(app_label)s.change_%(model_name)s"],
        "PATCH": ["%(app_label)s.change_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }


class IsAdmin(BasePermission):
    """Только администратор (управление пользователями, роли, системные настройки)."""

    message = "Доступно только администратору."

    def has_permission(self, request, view):
        return is_admin(request.user)


class HasDashboardAccess(BasePermission):
    """Доступ к дашборду по праву `dashboard.view_dashboard` (§4.5–4.7)."""

    message = "Нет доступа к дашборду."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.has_perm("dashboard.view_dashboard"))
        )
