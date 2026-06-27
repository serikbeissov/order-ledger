"""
Тесты баланса клиента (CLAUDE.md §4.2), включая сценарий возврата.
"""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from apps.clients.models import BalanceMovement, Client
from apps.clients.services import client_balance
from apps.common.phone import normalize_kz_phone
from apps.orders.models import Order, OrderItem, Return


def D(v):
    return Decimal(str(v))


class ClientBalanceTests(TestCase):
    def setUp(self):
        self.c = Client.objects.create(full_name="Клиент")

    def _deposit(self, amount, method=BalanceMovement.METHOD_CASH):
        return BalanceMovement.objects.create(
            client=self.c, direction=BalanceMovement.DIRECTION_DEPOSIT,
            amount=D(amount), method=method, paid_at=date.today(),
        )

    def _refund(self, amount):
        return BalanceMovement.objects.create(
            client=self.c, direction=BalanceMovement.DIRECTION_REFUND,
            amount=D(amount), paid_at=date.today(),
        )

    def test_deposit_only(self):
        self._deposit("50000")
        self.assertEqual(client_balance(self.c), D("50000.00"))

    def test_order_makes_due(self):
        # внёс 100к, заказ на 100к → баланс 0
        self._deposit("100000")
        order = Order.objects.create(client=self.c)
        OrderItem.objects.create(
            order=order, name="Т", cost_kzt=D("60000"), qty=1,
            sale_price=D("100000"),
        )
        self.assertEqual(client_balance(self.c), D("0.00"))

    def test_due_includes_delivery(self):
        # к оплате = выручка + доставка (§4.2)
        self._deposit("100000")
        order = Order.objects.create(client=self.c)
        OrderItem.objects.create(
            order=order, name="Т", cost_kzt=D("10000"), qty=2,
            sale_price=D("40000"), delivery_price=D("5000"),
        )
        # к оплате = 40000×2 + 5000×2 = 90000 → баланс 100000 − 90000 = 10000
        self.assertEqual(client_balance(self.c), D("10000.00"))

    def test_full_return_scenario(self):
        """
        Сценарий из §4.2: внёс 100к → заказ 100к (баланс 0) → сдал товар на склад
        (выручка→0, баланс +100к) → вернули 100к refund (баланс 0).
        """
        self._deposit("100000")
        order = Order.objects.create(client=self.c)
        item = OrderItem.objects.create(
            order=order, name="Т", cost_kzt=D("60000"), qty=1,
            sale_price=D("100000"),
        )
        self.assertEqual(client_balance(self.c), D("0.00"))

        # сдал товар на склад → выручка→0 → должны вернуть 100к
        Return.objects.create(
            order_item=item, qty=1,
            disposition=Return.DISPOSITION_RESTOCKED, return_date=date.today(),
        )
        self.assertEqual(client_balance(self.c), D("100000.00"))

        # выдали 100к как refund → баланс 0
        self._refund("100000")
        self.assertEqual(client_balance(self.c), D("0.00"))


class PhoneNormalizationTests(TestCase):
    def test_leading_8(self):
        self.assertEqual(normalize_kz_phone("87011234567"), "+77011234567")

    def test_ten_digits(self):
        self.assertEqual(normalize_kz_phone("7011234567"), "+77011234567")

    def test_formatted(self):
        self.assertEqual(normalize_kz_phone("+7 (701) 123-45-67"), "+77011234567")
