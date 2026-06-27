"""
Капитал, замороженный в складе (CLAUDE.md §4.5).

    полная_затрата = cost_kzt × qty + delivery_cost + other_costs
    КАПИТАЛ В СКЛАДЕ = Σ полная_затрата по товарам со status = in_stock | reserved
"""
from decimal import Decimal

from apps.common.money import ZERO, money

from .models import WarehouseItem


def frozen_capital(queryset=None) -> Decimal:
    """Замороженный в непроданном товаре капитал (§4.5)."""
    if queryset is None:
        queryset = WarehouseItem.objects.all()
    items = queryset.filter(
        status__in=[WarehouseItem.STATUS_IN_STOCK, WarehouseItem.STATUS_RESERVED]
    )
    return money(sum((i.full_cost for i in items), ZERO))
