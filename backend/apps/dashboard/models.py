from django.db import models


class DashboardAccess(models.Model):
    """
    Модель-носитель права без таблицы (CLAUDE.md §4.5–4.7).

    У дашборда нет собственных данных, но нужно настраиваемое право доступа,
    которое админ выдаёт ролям/пользователям. managed=False — таблица не
    создаётся; право `dashboard.view_dashboard` создаётся при миграции.
    """

    class Meta:
        managed = False
        default_permissions = ()
        permissions = [("view_dashboard", "Доступ к дашборду")]
