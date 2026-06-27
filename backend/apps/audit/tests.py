"""Тесты аудита изменений и привязки платежей к заказам."""
from datetime import date

from django.contrib.auth.models import Group, User
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.clients.models import Client
from apps.orders.models import Order
from apps.orders.services import order_paid


class AuditTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("root", "r@e.com", "pass12345")
        self.client.force_login(self.admin)

    def test_create_logged_with_user(self):
        self.client.post("/api/clients/", {"full_name": "Тест"}, format="json")
        log = AuditLog.objects.filter(model="client", action="create").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.username, "root")
        self.assertIn("full_name", log.changes)

    def test_update_records_diff(self):
        c = Client.objects.create(full_name="Старое имя")
        self.client.patch(f"/api/clients/{c.id}/", {"full_name": "Новое имя"}, format="json")
        log = AuditLog.objects.filter(model="client", action="update").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.changes["full_name"]["from"], "Старое имя")
        self.assertEqual(log.changes["full_name"]["to"], "Новое имя")

    def test_access_change_logged(self):
        u = User.objects.create_user("petrov", password="x")
        g = Group.objects.create(name="Менеджер")
        u.groups.add(g)
        log = AuditLog.objects.filter(model="user").filter(
            changes__роли__isnull=False
        ).first()
        self.assertIsNotNone(log)

    def test_audit_admin_only(self):
        staff_g = Group.objects.create(name="Сотрудник")
        u = User.objects.create_user("staff1", password="x")
        u.groups.add(staff_g)
        self.client.logout()
        self.client.login(username="staff1", password="x")
        self.assertEqual(self.client.get("/api/audit/").status_code, 403)


class OrderPaymentTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("root", "r@e.com", "pass12345")
        self.client.force_login(self.admin)
        self.c = Client.objects.create(full_name="К")
        self.order = Order.objects.create(client=self.c)
        from apps.orders.models import OrderItem
        OrderItem.objects.create(order=self.order, name="Т", cost_kzt=50000, qty=1,
            sale_price=100000)

    def test_payment_allocated_to_order(self):
        r = self.client.post(f"/api/clients/{self.c.id}/movements/", {
            "direction": "deposit", "amount": "60000", "method": "cash",
            "paid_at": "2026-06-10", "comment": "аванс", "order": self.order.id,
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(order_paid(self.order), 60000)
        detail = self.client.get(f"/api/orders/{self.order.id}/").json()
        self.assertEqual(float(detail["paid"]), 60000)
        self.assertEqual(float(detail["remaining"]), 40000)  # due 100000 − 60000
