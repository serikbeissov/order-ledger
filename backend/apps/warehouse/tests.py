"""Тесты замороженного капитала склада (CLAUDE.md §4.5)."""
from decimal import Decimal

from django.test import TestCase

from apps.warehouse.models import WarehouseItem
from apps.warehouse.services import frozen_capital


def D(v):
    return Decimal(str(v))


class FrozenCapitalTests(TestCase):
    def test_full_cost(self):
        item = WarehouseItem.objects.create(
            name="Т", cost_kzt=D("1000"), qty=3,
            delivery_cost=D("500"), other_costs=D("200"),
        )
        # 1000×3 + 500 + 200 = 3700
        self.assertEqual(item.full_cost, D("3700.00"))

    def test_only_in_stock_and_reserved(self):
        WarehouseItem.objects.create(
            name="В наличии", cost_kzt=D("1000"), qty=1,
            status=WarehouseItem.STATUS_IN_STOCK,
        )
        WarehouseItem.objects.create(
            name="Резерв", cost_kzt=D("2000"), qty=1,
            status=WarehouseItem.STATUS_RESERVED,
        )
        WarehouseItem.objects.create(
            name="Продан", cost_kzt=D("9999"), qty=1,
            status=WarehouseItem.STATUS_SOLD,  # не учитывается
        )
        # 1000 + 2000 = 3000 (проданный не считается)
        self.assertEqual(frozen_capital(), D("3000.00"))
