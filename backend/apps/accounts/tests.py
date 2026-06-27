"""
Тесты доступа по правам (CLAUDE.md §3.3): что выдано роли/пользователю, то и
доступно. Видимость раздела = view_<model>, действия = add_/change_/delete_.
"""
from django.contrib.auth.models import Group, Permission, User
from django.core.management import call_command
from rest_framework.test import APITestCase


class PermissionGatingTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # сиды создают группы admin/manager/staff с правами
        call_command("seed")

    def _make_user(self, username, role_title):
        user = User.objects.create_user(username=username, password="pass12345")
        user.groups.add(Group.objects.get(name=role_title))
        return user

    def test_staff_sees_clients_not_expenses(self):
        self._make_user("staff1", "Сотрудник")
        self.client.login(username="staff1", password="pass12345")
        self.assertEqual(self.client.get("/api/clients/").status_code, 200)
        self.assertEqual(self.client.get("/api/expenses/").status_code, 403)
        self.assertEqual(
            self.client.get("/api/dashboard/?period=2026-06").status_code, 403
        )

    def test_staff_cannot_delete(self):
        user = self._make_user("staff2", "Сотрудник")
        from apps.clients.models import Client as ClientModel

        c = ClientModel.objects.create(full_name="Тест")
        self.client.login(username="staff2", password="pass12345")
        # нет delete_client → 403
        self.assertEqual(self.client.delete(f"/api/clients/{c.id}/").status_code, 403)
        # выдаём change → можно патчить, но всё ещё нельзя удалять
        user.user_permissions.add(Permission.objects.get(codename="delete_client"))
        self.assertEqual(self.client.delete(f"/api/clients/{c.id}/").status_code, 204)

    def test_manager_sees_dashboard(self):
        self._make_user("mgr", "Менеджер")
        self.client.login(username="mgr", password="pass12345")
        self.assertEqual(
            self.client.get("/api/dashboard/?period=2026-06").status_code, 200
        )

    def test_individual_permission_grants_access(self):
        user = self._make_user("staff3", "Сотрудник")
        self.client.login(username="staff3", password="pass12345")
        self.assertEqual(self.client.get("/api/reserves/").status_code, 403)
        # индивидуальное право поверх роли
        user.user_permissions.add(Permission.objects.get(codename="view_reserve"))
        self.assertEqual(self.client.get("/api/reserves/").status_code, 200)

    def test_admin_manages_roles_and_catalog(self):
        admin = User.objects.create_superuser("root", "r@e.com", "pass12345")
        self.client.force_login(admin)
        self.assertEqual(self.client.get("/api/groups/").status_code, 200)
        self.assertEqual(self.client.get("/api/permissions/").status_code, 200)
        # не-админ не имеет доступа к управлению
        self._make_user("staff4", "Сотрудник")
        self.client.logout()
        self.client.login(username="staff4", password="pass12345")
        self.assertEqual(self.client.get("/api/groups/").status_code, 403)
        self.assertEqual(self.client.get("/api/permissions/").status_code, 403)
