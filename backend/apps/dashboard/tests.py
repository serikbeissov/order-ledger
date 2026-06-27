"""
Тесты сводного P&L (§4.6) и «Денег на счету» (§4.7) — числовой сценарий.
"""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from apps.clients.models import BalanceMovement, Client
from apps.expenses.models import Expense, ExpenseCategory
from apps.finance.models import Investment, Investor, Reserve, ReserveMovement
from apps.orders.models import Order, OrderItem
from apps.dashboard.services import money_on_account, pnl


def D(v):
    return Decimal(str(v))


class DashboardScenarioTests(TestCase):
    def setUp(self):
        today = date.today()
        self.today = today

        # Клиент A: внёс 100к, завершённый заказ на 100к (себес 60к) → прибыль 40к
        self.a = Client.objects.create(full_name="A")
        BalanceMovement.objects.create(
            client=self.a, direction=BalanceMovement.DIRECTION_DEPOSIT,
            amount=D("100000"), method=BalanceMovement.METHOD_CASH, paid_at=today,
        )
        order_a = Order.objects.create(client=self.a)
        OrderItem.objects.create(
            order=order_a, name="Т", cost_kzt=D("60000"), qty=1,
            sale_price=D("100000"), issued_qty=1, status=OrderItem.STATUS_ISSUED,
        )

        # Клиент B: внёс 50к, НЕзавершённый заказ → деньги клиента = 50к
        self.b = Client.objects.create(full_name="B")
        BalanceMovement.objects.create(
            client=self.b, direction=BalanceMovement.DIRECTION_DEPOSIT,
            amount=D("50000"), method=BalanceMovement.METHOD_CARD, paid_at=today,
        )
        order_b = Order.objects.create(client=self.b)
        OrderItem.objects.create(
            order=order_b, name="Т", cost_kzt=D("20000"), qty=1,
            sale_price=D("30000"), issued_qty=0, status=OrderItem.STATUS_ORDERED,
        )

        # Постоянные расходы 10к
        cat = ExpenseCategory.objects.create(name="Аренда", is_recurring=True)
        Expense.objects.create(
            category=cat, amount=D("10000"), expense_date=today, is_recurring=True
        )

        # Инвестиции: вложили 200к, вернули 50к → пул 150к
        inv = Investor.objects.create(name="Инвестор")
        Investment.objects.create(
            investor=inv, direction=Investment.DIRECTION_IN,
            amount=D("200000"), moved_at=today,
        )
        Investment.objects.create(
            investor=inv, direction=Investment.DIRECTION_RETURN,
            amount=D("50000"), moved_at=today,
        )

        # Резервы: налоги 5к, ежемесячные 8к
        r_tax = Reserve.objects.create(name="Налоги", kind=Reserve.KIND_TAX)
        ReserveMovement.objects.create(
            reserve=r_tax, direction=ReserveMovement.DIRECTION_SET_ASIDE,
            amount=D("5000"), moved_at=today,
        )
        r_month = Reserve.objects.create(name="Ежемесячные", kind=Reserve.KIND_MONTHLY)
        ReserveMovement.objects.create(
            reserve=r_month, direction=ReserveMovement.DIRECTION_SET_ASIDE,
            amount=D("8000"), moved_at=today,
        )

    def test_money_on_account(self):
        m = money_on_account()
        # деньги компании = прибыль(завершённые) 40000 − расходы 10000 = 30000
        self.assertEqual(m["company_money"], D("30000.00"))
        # деньги клиентов = только B (незавершённый) = 50000
        self.assertEqual(m["client_money"], D("50000.00"))
        # инвестиции = 200000 − 50000 = 150000
        self.assertEqual(m["investments"], D("150000.00"))
        # итого = 50000 + 150000 + 30000 = 230000
        self.assertEqual(m["total"], D("230000.00"))
        # резервы
        self.assertEqual(m["reserves"]["tax"], D("5000.00"))
        self.assertEqual(m["reserves"]["monthly"], D("8000.00"))
        self.assertEqual(m["reserves"]["total"], D("13000.00"))
        # свободные = 30000 − 13000 = 17000
        self.assertEqual(m["free_money"], D("17000.00"))
        self.assertFalse(m["reserves_exceed_company"])

    def test_pnl_period(self):
        df = date(self.today.year, self.today.month, 1)
        dt = self.today
        result = pnl(df, dt)
        self.assertEqual(result["profit_from_orders"], D("40000.00"))
        self.assertEqual(result["fixed_expenses"], D("10000.00"))
        self.assertEqual(result["net_profit"], D("30000.00"))
        self.assertEqual(result["orders_count"], 1)

    def test_reserves_exceed_company_flag(self):
        # добавим огромный резерв → флаг должен стать True
        r = Reserve.objects.create(name="Большой", kind=Reserve.KIND_OTHER)
        ReserveMovement.objects.create(
            reserve=r, direction=ReserveMovement.DIRECTION_SET_ASIDE,
            amount=D("100000"), moved_at=self.today,
        )
        m = money_on_account()
        self.assertTrue(m["reserves_exceed_company"])
