"""
Автоматический аудит изменений по сигналам моделей.

Отслеживаем ключевые бизнес- и финансовые модели, а также изменения доступа
(группы/права пользователей и права ролей). Текущий пользователь берётся из
thread-local (middleware).
"""
from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth.models import Group, User
from django.db.models.signals import (
    m2m_changed,
    post_delete,
    post_save,
    pre_save,
)

from .middleware import get_current_user

# Поля, которые не логируем (шум/секреты).
EXCLUDED = {"id", "created_at", "password", "last_login"}


def _tracked_models():
    from apps.clients.models import Client, BalanceMovement
    from apps.orders.models import Order, OrderItem, OrderExpense, Return
    from apps.warehouse.models import WarehouseItem
    from apps.expenses.models import Expense, ExpenseCategory, RecurringExpense
    from apps.finance.models import Investor, Investment, Reserve, ReserveMovement

    return [
        Client, BalanceMovement, Order, OrderItem, OrderExpense, Return,
        WarehouseItem, Expense, ExpenseCategory, RecurringExpense,
        Investor, Investment, Reserve, ReserveMovement, User, Group,
    ]


def _ser(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _field_values(instance):
    data = {}
    for f in instance._meta.concrete_fields:
        if f.attname in EXCLUDED:
            continue
        data[f.attname] = _ser(getattr(instance, f.attname))
    return data


def _write(instance, action, changes):
    from .models import AuditLog

    user = get_current_user()
    AuditLog.objects.create(
        user=user if getattr(user, "pk", None) else None,
        username=getattr(user, "username", "") or "",
        action=action,
        app_label=instance._meta.app_label,
        model=instance._meta.model_name,
        model_label=str(instance._meta.verbose_name),
        object_id=str(getattr(instance, "pk", "")),
        object_repr=str(instance)[:255],
        changes=changes,
    )


def _pre_save(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return
    if not instance.pk:
        instance._audit_old = None
        return
    try:
        old = sender.objects.get(pk=instance.pk)
        instance._audit_old = _field_values(old)
    except sender.DoesNotExist:
        instance._audit_old = None


def _post_save(sender, instance, created, **kwargs):
    if kwargs.get("raw"):
        return
    new = _field_values(instance)
    if created or getattr(instance, "_audit_old", None) is None:
        changes = {k: {"to": v} for k, v in new.items()}
        _write(instance, "create", changes)
    else:
        old = instance._audit_old
        changes = {
            k: {"from": old.get(k), "to": v}
            for k, v in new.items()
            if old.get(k) != v
        }
        if changes:  # без изменений не пишем
            _write(instance, "update", changes)


def _post_delete(sender, instance, **kwargs):
    _write(instance, "delete", {})


# --- изменения доступа (m2m) -------------------------------------------------
M2M_LABEL = {"groups": "роли", "user_permissions": "личные права", "permissions": "права роли"}


def _m2m(sender, instance, action, pk_set, **kwargs):
    if action not in ("post_add", "post_remove", "post_clear"):
        return
    rel = None
    for name in ("groups", "user_permissions", "permissions"):
        field = getattr(type(instance), name, None)
        if field is not None and getattr(field, "through", None) is sender:
            rel = name
            break
    if rel is None:
        return
    verb = {"post_add": "добавлены", "post_remove": "убраны", "post_clear": "очищены"}[action]
    _write(instance, "update", {M2M_LABEL.get(rel, rel): {"action": verb,
            "ids": sorted(pk_set) if pk_set else []}})


def connect():
    for model in _tracked_models():
        pre_save.connect(_pre_save, sender=model, dispatch_uid=f"audit_pre_{model.__name__}")
        post_save.connect(_post_save, sender=model, dispatch_uid=f"audit_post_{model.__name__}")
        post_delete.connect(_post_delete, sender=model, dispatch_uid=f"audit_del_{model.__name__}")
    # изменения доступа
    m2m_changed.connect(_m2m, sender=User.groups.through, dispatch_uid="audit_user_groups")
    m2m_changed.connect(_m2m, sender=User.user_permissions.through, dispatch_uid="audit_user_perms")
    m2m_changed.connect(_m2m, sender=Group.permissions.through, dispatch_uid="audit_group_perms")
