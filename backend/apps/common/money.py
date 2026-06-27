"""
Денежные хелперы.

Все деньги в системе — Decimal(12,2) в тенге (KZT) с банковским округлением
(ROUND_HALF_EVEN). float для денег не используется никогда (CLAUDE.md §10).
"""
from decimal import ROUND_HALF_EVEN, Decimal

# Точность денежной суммы: два знака после запятой.
CENTS = Decimal("0.01")
ZERO = Decimal("0.00")


def money(value) -> Decimal:
    """Привести значение к денежному Decimal с банковским округлением."""
    if value is None:
        return ZERO
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(CENTS, rounding=ROUND_HALF_EVEN)
