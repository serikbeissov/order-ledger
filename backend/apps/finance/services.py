"""
Инвестиции и резервы (CLAUDE.md §4.7).

Инвестиции    = Σ Investment(in) − Σ Investment(return)
Резерв        = Σ set_aside − Σ release (по каждому резерву)
"""
from decimal import Decimal

from apps.common.money import ZERO, money

from .models import Investment, Reserve, ReserveMovement


def investments_pool(queryset=None) -> Decimal:
    """Невозвращённые вложения инвесторов (§4.7)."""
    if queryset is None:
        queryset = Investment.objects.all()
    total = ZERO
    for inv in queryset:
        if inv.direction == Investment.DIRECTION_IN:
            total += inv.amount
        else:
            total -= inv.amount
    return money(total)


def reserve_balance(reserve: Reserve) -> Decimal:
    """Текущий объём резерва = Σ set_aside − Σ release."""
    total = ZERO
    for m in reserve.movements.all():
        if m.direction == ReserveMovement.DIRECTION_SET_ASIDE:
            total += m.amount
        else:
            total -= m.amount
    return money(total)


def reserves_total(kind: str | None = None) -> Decimal:
    """Сумма всех резервов (опц. только указанного kind: tax | monthly | other)."""
    qs = Reserve.objects.all()
    if kind is not None:
        qs = qs.filter(kind=kind)
    return money(sum((reserve_balance(r) for r in qs), ZERO))
