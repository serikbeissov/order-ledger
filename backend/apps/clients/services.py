"""
Баланс клиента (CLAUDE.md §4.2) — единственное место расчёта.

    БАЛАНС = пополнения − возвраты_клиенту − к_оплате

где к_оплате = Σ по заказам клиента (выручка_заказа + доставка_заказа);
выручка уже учитывает возвраты товара (§4.1).
  > 0 — переплата (в т.ч. сумма к возврату за сданный товар);
  < 0 — клиент должен доплатить;
  = 0 — рассчитались.
"""
from decimal import Decimal

from apps.common.money import ZERO, money
from apps.orders.services import order_calculation

from .models import BalanceMovement, Client


def client_deposits(client: Client) -> Decimal:
    return money(sum(
        (m.amount for m in client.movements.all()
         if m.direction == BalanceMovement.DIRECTION_DEPOSIT),
        ZERO,
    ))


def client_refunds(client: Client) -> Decimal:
    return money(sum(
        (m.amount for m in client.movements.all()
         if m.direction == BalanceMovement.DIRECTION_REFUND),
        ZERO,
    ))


def client_due(client: Client, *, only_completed: bool = False) -> Decimal:
    """
    К оплате по заказам клиента = Σ (выручка + доставка).

    only_completed=True — учитывать только завершённые заказы (для §4.7,
    «деньги клиентов» по незавершённым). Архивные заказы не учитываются.
    """
    from apps.orders.services import is_order_completed

    total = ZERO
    for order in client.orders.filter(is_archived=False):
        if only_completed and not is_order_completed(order):
            continue
        calc = order_calculation(order)
        total += calc["due"]
    return money(total)


def client_balance(client: Client) -> Decimal:
    """БАЛАНС = пополнения − возвраты_клиенту − к_оплате (§4.2)."""
    return money(client_deposits(client) - client_refunds(client) - client_due(client))
