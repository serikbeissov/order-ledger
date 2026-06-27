"""
Тесты прибыли заказа и статусов (CLAUDE.md §4.1, §4.4) — числовые примеры.
"""
from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APITestCase

from apps.clients.models import Client
from apps.orders.models import Order, OrderExpense, OrderItem, Return
from apps.orders.services import (
    apply_issue,
    is_order_completed,
    order_calculation,
    order_status,
    sync_order_status,
)
from apps.warehouse.models import WarehouseItem


def D(v):
    return Decimal(str(v))


class OrderProfitTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(full_name="Тест Клиент")
        self.order = Order.objects.create(client=self.client_obj)

    def _item(self, **kw):
        defaults = dict(
            order=self.order, name="Товар", cost_kzt=D("1000"), qty=1,
            sale_price=D("1500"), delivery_price=D("0"),
        )
        defaults.update(kw)
        return OrderItem.objects.create(**defaults)

    def test_simple_profit(self):
        # 2 шт по 1500 продажа, себес 1000 → выручка 3000, себес 2000, прибыль 1000
        self._item(qty=2, cost_kzt=D("1000"), sale_price=D("1500"))
        calc = order_calculation(self.order)
        self.assertEqual(calc["revenue"], D("3000.00"))
        self.assertEqual(calc["cost"], D("2000.00"))
        self.assertEqual(calc["profit"], D("1000.00"))

    def test_delivery_not_in_profit(self):
        # доставка 500/ед × 2 — НЕ входит в прибыль (§4.1), но в «к оплате» входит
        self._item(qty=2, cost_kzt=D("1000"), sale_price=D("1500"),
                   delivery_price=D("500"))
        calc = order_calculation(self.order)
        self.assertEqual(calc["profit"], D("1000.00"))  # без доставки
        self.assertEqual(calc["delivery"], D("1000.00"))
        self.assertEqual(calc["due"], D("4000.00"))  # выручка 3000 + доставка 1000

    def test_extra_expenses_reduce_profit(self):
        self._item(qty=1, cost_kzt=D("1000"), sale_price=D("1500"))
        OrderExpense.objects.create(
            order=self.order, type=OrderExpense.TYPE_TAXI, amount=D("200")
        )
        calc = order_calculation(self.order)
        # 1500 − 1000 − 200 = 300
        self.assertEqual(calc["profit"], D("300.00"))

    def test_return_restocked_excludes_cost(self):
        # 3 шт, вернули 1 на склад → продано 2: выручка 3000, себес 2000, прибыль 1000
        item = self._item(qty=3, cost_kzt=D("1000"), sale_price=D("1500"))
        Return.objects.create(
            order_item=item, qty=1,
            disposition=Return.DISPOSITION_RESTOCKED, return_date=date.today()
        )
        calc = order_calculation(self.order)
        self.assertEqual(calc["revenue"], D("3000.00"))
        self.assertEqual(calc["cost"], D("2000.00"))  # себес только за 2 проданных
        self.assertEqual(calc["profit"], D("1000.00"))

    def test_return_write_off_keeps_cost(self):
        # 3 шт, 1 списан в брак → продано 2 (выручка 3000), но себес за 3 (3000)
        item = self._item(qty=3, cost_kzt=D("1000"), sale_price=D("1500"))
        Return.objects.create(
            order_item=item, qty=1,
            disposition=Return.DISPOSITION_WRITE_OFF, return_date=date.today()
        )
        calc = order_calculation(self.order)
        self.assertEqual(calc["revenue"], D("3000.00"))
        self.assertEqual(calc["cost"], D("3000.00"))  # себес за брак остаётся
        self.assertEqual(calc["profit"], D("0.00"))

    def test_supplier_refund_excludes_cost(self):
        item = self._item(qty=2, cost_kzt=D("1000"), sale_price=D("1500"))
        Return.objects.create(
            order_item=item, qty=1,
            disposition=Return.DISPOSITION_SUPPLIER_REFUND, return_date=date.today()
        )
        calc = order_calculation(self.order)
        # продано 1: выручка 1500, себес 1000, прибыль 500
        self.assertEqual(calc["profit"], D("500.00"))


class OrderStatusTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(full_name="Клиент")
        self.order = Order.objects.create(client=self.client_obj)

    def test_partial_issue_updates_status(self):
        item = OrderItem.objects.create(
            order=self.order, name="Т", cost_kzt=D("100"), qty=5,
            sale_price=D("200"), status=OrderItem.STATUS_RECEIVED,
        )
        apply_issue(item, 2)
        item.save()
        st = order_status(self.order)
        self.assertFalse(st["completed"])
        self.assertEqual(st["issued_qty"], 2)
        self.assertEqual(st["total_qty"], 5)
        self.assertIn("выдано 2 из 5", st["label"])

    def test_full_issue_completes_order(self):
        item = OrderItem.objects.create(
            order=self.order, name="Т", cost_kzt=D("100"), qty=3,
            sale_price=D("200"), status=OrderItem.STATUS_RECEIVED,
        )
        apply_issue(item, 3)
        item.save()
        self.assertEqual(item.status, OrderItem.STATUS_ISSUED)
        self.assertTrue(is_order_completed(self.order))
        self.assertEqual(order_status(self.order)["label"], "Выдан")


class StatusHistoryTests(TestCase):
    def setUp(self):
        self.c = Client.objects.create(full_name="К")
        self.order = Order.objects.create(client=self.c)

    def test_status_events_recorded_on_change(self):
        item = OrderItem.objects.create(
            order=self.order, name="Т", cost_kzt=D("100"), qty=4,
            sale_price=D("200"), status=OrderItem.STATUS_RECEIVED,
        )
        sync_order_status(self.order)
        self.assertEqual(self.order.status_events.count(), 1)
        # повтор без изменений — новой записи нет
        sync_order_status(self.order)
        self.assertEqual(self.order.status_events.count(), 1)
        # частичная выдача — новая запись (прогресс изменился)
        apply_issue(item, 2)
        item.save()
        sync_order_status(self.order)
        self.assertEqual(self.order.status_events.count(), 2)
        last = self.order.status_events.first()
        self.assertEqual(last.issued_qty, 2)
        self.assertEqual(last.total_qty, 4)


class WarehouseSellTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("root", "r@e.com", "pass12345")
        self.client.force_login(self.admin)
        self.c = Client.objects.create(full_name="К")
        self.order = Order.objects.create(client=self.c)
        self.wi = WarehouseItem.objects.create(
            name="Сумка", cost_kzt=D("60000"), qty=1, planned_price=D("100000"),
            status=WarehouseItem.STATUS_IN_STOCK,
        )

    def test_selling_marks_warehouse_sold_and_links(self):
        r = self.client.post(
            f"/api/orders/{self.order.id}/items/",
            {"name": "Сумка", "cost_kzt": "60000", "qty": 1, "sale_price": "100000",
             "warehouse_item": self.wi.id},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.wi.refresh_from_db()
        self.assertEqual(self.wi.status, WarehouseItem.STATUS_SOLD)
        item = self.order.items.first()
        self.assertEqual(item.warehouse_item_id, self.wi.id)
        # история статуса появилась
        self.assertGreaterEqual(self.order.status_events.count(), 1)

    def test_partial_warehouse_sale_decrements_qty(self):
        wi = WarehouseItem.objects.create(
            name="Кроссовки", cost_kzt=D("40000"), qty=3,
            status=WarehouseItem.STATUS_IN_STOCK,
        )
        r = self.client.post(
            f"/api/orders/{self.order.id}/items/",
            {"name": "Кроссовки", "cost_kzt": "40000", "qty": 1, "sale_price": "75000",
             "warehouse_item": wi.id},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        wi.refresh_from_db()
        self.assertEqual(wi.qty, 2)  # продали 1 из 3
        self.assertEqual(wi.status, WarehouseItem.STATUS_IN_STOCK)

    def test_deleting_warehouse_item_restores_stock(self):
        wi = WarehouseItem.objects.create(
            name="Часы", cost_kzt=D("30000"), qty=2,
            status=WarehouseItem.STATUS_IN_STOCK,
        )
        r = self.client.post(
            f"/api/orders/{self.order.id}/items/",
            {"name": "Часы", "cost_kzt": "30000", "qty": 2, "sale_price": "60000",
             "warehouse_item": wi.id},
            format="json",
        )
        iid = self.order.items.first().id
        wi.refresh_from_db()
        self.assertEqual(wi.status, WarehouseItem.STATUS_SOLD)
        self.client.delete(f"/api/orders/{self.order.id}/items/{iid}/")
        wi.refresh_from_db()
        self.assertEqual(wi.status, WarehouseItem.STATUS_IN_STOCK)
        self.assertEqual(wi.qty, 4)  # вернули 2
