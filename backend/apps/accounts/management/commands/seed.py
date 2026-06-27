"""
Идемпотентные сиды первого запуска (CLAUDE.md §10):
- группы прав admin/manager/staff;
- категории расходов (СММ, Аренда, Зарплата, Браки, Налоги, Прочее);
- суперпользователь-админ.

Бренд берётся из BRAND_NAME, в код не зашивается.
"""
import os

from django.contrib.auth.models import Group, Permission, User
from django.core.management.base import BaseCommand

from apps.accounts.roles import ROLE_ADMIN, ROLE_GROUPS, ROLE_MANAGER, ROLE_STAFF

# Категории расходов: (название, ежемесячная ли)
DEFAULT_CATEGORIES = [
    ("СММ", True),
    ("Аренда", True),
    ("Зарплата", True),
    ("Браки", False),
    ("Налоги", False),
    ("Прочее", False),
]

# Операционные приложения, к которым у менеджера/сотрудника есть доступ.
MANAGER_APPS = [
    "clients", "orders", "warehouse", "expenses", "finance",
]
STAFF_APPS = ["clients", "orders", "warehouse"]


class Command(BaseCommand):
    help = "Создать группы прав, категории расходов и суперпользователя-админа."

    def handle(self, *args, **options):
        self._seed_groups()
        self._seed_categories()
        self._seed_admin()
        self.stdout.write(self.style.SUCCESS("Сиды применены."))

    def _seed_groups(self):
        all_perms = Permission.objects.all()
        for code in (ROLE_ADMIN, ROLE_MANAGER, ROLE_STAFF):
            group, _ = Group.objects.get_or_create(name=ROLE_GROUPS[code])
            if code == ROLE_ADMIN:
                group.permissions.set(all_perms)
            elif code == ROLE_MANAGER:
                group.permissions.set(
                    all_perms.filter(content_type__app_label__in=MANAGER_APPS)
                )
            else:  # staff: операционка без удаления
                perms = all_perms.filter(
                    content_type__app_label__in=STAFF_APPS
                ).exclude(codename__startswith="delete_")
                group.permissions.set(perms)
            self.stdout.write(f"  группа: {group.name} ({group.permissions.count()} прав)")

    def _seed_categories(self):
        from apps.expenses.models import ExpenseCategory

        for name, recurring in DEFAULT_CATEGORIES:
            ExpenseCategory.objects.get_or_create(
                name=name, defaults={"is_recurring": recurring}
            )
        self.stdout.write(f"  категорий расходов: {ExpenseCategory.objects.count()}")

    def _seed_admin(self):
        username = os.environ.get("DJANGO_ADMIN_USERNAME", "admin")
        password = os.environ.get("DJANGO_ADMIN_PASSWORD", "admin")
        email = os.environ.get("DJANGO_ADMIN_EMAIL", "admin@example.com")
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_superuser(username, email, password)
            admin_group = Group.objects.get(name=ROLE_GROUPS[ROLE_ADMIN])
            user.groups.add(admin_group)
            self.stdout.write(
                self.style.WARNING(
                    f"  создан админ '{username}' (пароль '{password}' — смените!)"
                )
            )
        else:
            self.stdout.write(f"  админ '{username}' уже существует")
