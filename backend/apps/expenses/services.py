"""
Сервисы расходов: напоминание об оплате ежемесячных расходов.
"""
import calendar
from datetime import date

from .models import Expense, RecurringExpense


def month_bounds(period: str | None) -> tuple[date, date]:
    """'YYYY-MM' → (первое, последнее число месяца). По умолчанию — текущий."""
    if period:
        year, month = (int(x) for x in period.split("-")[:2])
    else:
        today = date.today()
        year, month = today.year, today.month
    last = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


def recurring_due(period: str | None = None) -> list[dict]:
    """
    Активные ежемесячные напоминания (RecurringExpense), по которым за месяц ещё
    НЕ записан фактический расход. Напоминание гасится Expense, который либо
    ссылается на него (`recurring`), либо относится к той же категории за месяц.
    Месяц — по `period` расхода, иначе по дате выдачи (`expense_date`).

    Возвращает список пунктов-напоминаний для UI/баннера.
    """
    from django.db.models import Q

    df, dt = month_bounds(period)
    due = []
    for tmpl in RecurringExpense.objects.filter(is_active=True).select_related(
        "category"
    ):
        paid = (
            Expense.objects.filter(
                Q(recurring=tmpl) | Q(recurring__isnull=True, category=tmpl.category)
            )
            .filter(models_q_for_month(df, dt))
            .exists()
        )
        if not paid:
            due.append({
                "id": tmpl.id,
                "name": tmpl.name,
                "category": tmpl.category_id,
                "category_name": tmpl.category.name,
                "planned_amount": str(tmpl.planned_amount)
                if tmpl.planned_amount is not None
                else None,
                "method": tmpl.method,
            })
    return due


def models_q_for_month(df: date, dt: date):
    """Q: расход относится к месяцу по period, иначе по expense_date."""
    from django.db.models import Q

    return (
        Q(period__gte=df, period__lte=dt)
        | Q(period__isnull=True, expense_date__gte=df, expense_date__lte=dt)
    )
