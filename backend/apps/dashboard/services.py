"""
Сводные агрегаты дашборда (CLAUDE.md §4.5–4.7).

Здесь два разных взгляда:
- P&L за период (§4.6) — прибыль выданных заказов и расходы за выбранный месяц;
- «Деньги на счету» (§4.7) — накопленная позиция (не за период): сколько всего
  денег у компании в моменте и чьи они.
"""
import calendar
from datetime import date
from decimal import Decimal

from apps.clients.models import BalanceMovement, Client
from apps.clients.services import (
    client_deposits,
    client_due,
    client_refunds,
)
from apps.common.money import ZERO, money
from apps.expenses.models import Expense
from apps.finance.models import Investment, Reserve
from apps.finance.services import investments_pool, reserve_balance
from apps.orders.models import Order
from apps.orders.services import is_order_completed, order_profit
from apps.warehouse.services import frozen_capital


# --- Период ------------------------------------------------------------------
def month_bounds(period: str | None) -> tuple[date, date]:
    """period 'YYYY-MM' → (первый день, последний день месяца)."""
    if period:
        year, month = (int(x) for x in period.split("-"))
    else:
        raise ValueError("период не задан")
    last = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


# --- Завершённые заказы ------------------------------------------------------
def completed_orders():
    return [o for o in Order.objects.filter(is_archived=False) if is_order_completed(o)]


# --- §4.6 P&L за период ------------------------------------------------------
def pnl(date_from: date, date_to: date) -> dict:
    """
    ЧИСТАЯ ПРИБЫЛЬ = прибыль_с_заказов − постоянные_расходы (§4.6).

    Прибыль — по заказам, **завершённым** (выданным) в периоде, по дате выдачи,
    а не создания; расходы — за период.
    """
    from apps.orders.services import order_completed_at

    orders = []
    for o in completed_orders():
        done = order_completed_at(o)
        if done and date_from <= done.date() <= date_to:
            orders.append(o)
    profit_from_orders = money(sum((order_profit(o) for o in orders), ZERO))
    expenses = money(sum(
        (e.amount for e in Expense.objects.filter(
            expense_date__gte=date_from, expense_date__lte=date_to)),
        ZERO,
    ))
    return {
        "profit_from_orders": profit_from_orders,
        "fixed_expenses": expenses,
        "net_profit": money(profit_from_orders - expenses),
        "orders_count": len(orders),
    }


# --- §4.7 Деньги на счету ----------------------------------------------------
def client_money() -> Decimal:
    """
    Деньги клиентов = Σ по клиентам max(0, внесено − возвраты − к_оплате(завершённые)).

    Предоплаты под незавершённые заказы — это обязательство, ещё не наши деньги.
    """
    total = ZERO
    for c in Client.objects.filter(is_archived=False):
        net = (
            client_deposits(c)
            - client_refunds(c)
            - client_due(c, only_completed=True)
        )
        if net > 0:
            total += net
    return money(total)


def company_money() -> Decimal:
    """
    Деньги компании = Σ ПРИБЫЛЬ(завершённые) − Σ Expense (накопительно, §4.7).
    """
    profit = sum((order_profit(o) for o in completed_orders()), ZERO)
    expenses = sum((e.amount for e in Expense.objects.all()), ZERO)
    return money(profit - expenses)


def money_on_account() -> dict:
    """
    ДЕНЬГИ НА СЧЕТУ = Деньги клиентов + Инвестиции + Деньги компании (§4.7),
    с расшифровкой денег компании на резервы (налоги/ежемесячные) и свободные.
    """
    clients = client_money()
    investments = investments_pool()
    company = company_money()

    reserves_tax = money(sum(
        (reserve_balance(r) for r in Reserve.objects.filter(kind=Reserve.KIND_TAX)),
        ZERO,
    ))
    reserves_monthly = money(sum(
        (reserve_balance(r) for r in Reserve.objects.filter(kind=Reserve.KIND_MONTHLY)),
        ZERO,
    ))
    reserves_other = money(sum(
        (reserve_balance(r) for r in Reserve.objects.filter(kind=Reserve.KIND_OTHER)),
        ZERO,
    ))
    reserves_total = money(reserves_tax + reserves_monthly + reserves_other)
    free = money(company - reserves_total)

    return {
        "total": money(clients + investments + company),
        "client_money": clients,
        "investments": investments,
        "company_money": company,
        "reserves": {
            "total": reserves_total,
            "tax": reserves_tax,
            "monthly": reserves_monthly,
            "other": reserves_other,
        },
        "free_money": free,
        # красный флаг: отложено больше, чем заработано (§4.7)
        "reserves_exceed_company": reserves_total > company,
    }


# --- Разбивка остатка по способам (опц., §4.7) -------------------------------
def money_by_method() -> dict:
    """
    Денежный поток по способам (наличные/карта/терминал):
        Σ deposit − Σ refund (клиенты) + Σ инвестиции(in) − Σ инвестиции(return)
        − Σ постоянные расходы по способу.
    Примечание: закупка товара поставщику способом не фиксируется, поэтому это
    управленческий поток по каналам, а не выписка по счёту до копейки.
    """
    from apps.expenses.models import Expense

    result = {}
    for method in (
        BalanceMovement.METHOD_CASH,
        BalanceMovement.METHOD_CARD,
        BalanceMovement.METHOD_TERMINAL,
    ):
        deposits = sum(
            (m.amount for m in BalanceMovement.objects.filter(
                method=method, direction=BalanceMovement.DIRECTION_DEPOSIT)),
            ZERO,
        )
        refunds = sum(
            (m.amount for m in BalanceMovement.objects.filter(
                method=method, direction=BalanceMovement.DIRECTION_REFUND)),
            ZERO,
        )
        inv_in = sum(
            (i.amount for i in Investment.objects.filter(
                method=method, direction=Investment.DIRECTION_IN)),
            ZERO,
        )
        inv_out = sum(
            (i.amount for i in Investment.objects.filter(
                method=method, direction=Investment.DIRECTION_RETURN)),
            ZERO,
        )
        expenses = sum(
            (e.amount for e in Expense.objects.filter(method=method)),
            ZERO,
        )
        result[method] = money(deposits - refunds + inv_in - inv_out - expenses)
    return result


# --- Подсказки целей резервов (§4.7) -----------------------------------------
def reserve_target_hints(period: str | None = None) -> dict:
    """
    Рекомендации, сколько отложить:
    - на налоги ≈ 4% оборота через терминал (накопительно);
    - на ежемесячные ≈ Σ Expense(is_recurring) за последний полный месяц.
    """
    terminal_turnover = sum(
        (m.amount for m in BalanceMovement.objects.filter(
            method=BalanceMovement.METHOD_TERMINAL,
            direction=BalanceMovement.DIRECTION_DEPOSIT)),
        ZERO,
    )
    tax_hint = money(terminal_turnover * Decimal("0.04"))

    monthly_hint = ZERO
    if period:
        df, dt = month_bounds(period)
        monthly_hint = sum(
            (e.amount for e in Expense.objects.filter(
                is_recurring=True, expense_date__gte=df, expense_date__lte=dt)),
            ZERO,
        )
    return {"tax": tax_hint, "monthly": money(monthly_hint)}


# --- Управленческие списки ---------------------------------------------------
def debtors_list(limit: int = 20) -> list[dict]:
    """Клиенты с отрицательным балансом (кому звонить) — по убыванию долга."""
    from apps.clients.services import client_balance

    rows = []
    for c in Client.objects.filter(is_archived=False):
        bal = client_balance(c)
        if bal < 0:
            rows.append({
                "id": c.id, "full_name": c.full_name, "phone": c.phone,
                "debt": money(-bal),
            })
    rows.sort(key=lambda r: r["debt"], reverse=True)
    return rows[:limit]


def stale_orders(days: int = 14, limit: int = 20) -> list[dict]:
    """Незавершённые заказы старше N дней (зависшие — товар в пути/не выдан)."""
    from apps.orders.services import is_order_completed, order_status

    threshold = date.today() - __import__("datetime").timedelta(days=days)
    rows = []
    for o in Order.objects.filter(is_archived=False).select_related("client"):
        if is_order_completed(o):
            continue
        created_d = o.created_at.date()
        if created_d > threshold:
            continue
        st = order_status(o)
        if st["code"] == "empty":
            continue
        rows.append({
            "id": o.id, "client_name": o.client.full_name,
            "status": st["label"], "created_at": o.created_at.date().isoformat(),
            "days": (date.today() - created_d).days,
        })
    rows.sort(key=lambda r: r["days"], reverse=True)
    return rows[:limit]


def birthdays(within_days: int = 14) -> list[dict]:
    """Клиенты с днём рождения в ближайшие N дней."""
    today = date.today()
    rows = []
    for c in Client.objects.filter(is_archived=False).exclude(birth_date=None):
        bd = c.birth_date
        try:
            nxt = bd.replace(year=today.year)
        except ValueError:  # 29 февраля
            nxt = date(today.year, 3, 1)
        if nxt < today:
            nxt = nxt.replace(year=today.year + 1)
        delta = (nxt - today).days
        if 0 <= delta <= within_days:
            rows.append({
                "id": c.id, "full_name": c.full_name,
                "birth_date": bd.isoformat(), "in_days": delta,
            })
    rows.sort(key=lambda r: r["in_days"])
    return rows


def tax_block(df: date, dt: date) -> dict:
    """Налог 4% с оборота через терминал за период vs отложенный резерв (§4.3)."""
    turnover = sum(
        (m.amount for m in BalanceMovement.objects.filter(
            method=BalanceMovement.METHOD_TERMINAL,
            direction=BalanceMovement.DIRECTION_DEPOSIT,
            paid_at__gte=df, paid_at__lte=dt)),
        ZERO,
    )
    estimate = money(turnover * Decimal("0.04"))
    reserved = money(sum(
        (reserve_balance(r) for r in Reserve.objects.filter(kind=Reserve.KIND_TAX)),
        ZERO,
    ))
    return {
        "terminal_turnover": money(turnover),
        "estimate": estimate,
        "reserved": reserved,
        "shortfall": money(max(ZERO, estimate - reserved)),
    }


# --- Полный payload дашборда -------------------------------------------------
def dashboard_payload(period: str | None) -> dict:
    """Агрегаты для экрана дашборда (§4.5–4.7)."""
    if not period:
        today = date.today()
        period = f"{today.year:04d}-{today.month:02d}"
    df, dt = month_bounds(period)

    # долги и переплаты клиентов (по текущему балансу)
    from apps.clients.services import client_balance

    debts = ZERO
    overpayments = ZERO
    for c in Client.objects.filter(is_archived=False):
        bal = client_balance(c)
        if bal < 0:
            debts += -bal
        elif bal > 0:
            overpayments += bal

    period_pnl = pnl(df, dt)

    return {
        "period": period,
        "money_on_account": money_on_account(),
        "money_by_method": money_by_method(),
        "reserve_target_hints": reserve_target_hints(period),
        "pnl": period_pnl,
        "frozen_capital": frozen_capital(),
        "client_debts": money(debts),
        "client_overpayments": money(overpayments),
        "debtors": debtors_list(),
        "stale_orders": stale_orders(),
        "birthdays": birthdays(),
        "tax": tax_block(df, dt),
    }
