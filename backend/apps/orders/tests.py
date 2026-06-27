"""
Тесты прибыли заказа и статусов (CLAUDE.md §4.1, §4.4) — числовые примеры.
"""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from apps.clients.models import Client
from apps.orders.models import Order, OrderExpense, OrderItem, Return
from apps.orders.services import (
    apply_issue,
    is_order_completed,
    order_calculation,
    order_status,
)


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
