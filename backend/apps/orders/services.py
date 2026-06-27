"""
Бизнес-логика заказов (CLAUDE.md §4.1, §4.4) — единственное место расчёта
прибыли заказа, статуса и сводки по выдаче. В сериализаторах/JS не дублируется.
"""
from decimal import Decimal

from apps.common.money import ZERO, money

from .models import Order, OrderItem, Return


# --- Возвраты по позиции -----------------------------------------------------
def item_returned_qty(item: OrderItem) -> int:
    """Σ Return.qty по позиции (всего возвращено единиц)."""
    return sum(r.qty for r in item.returns.all())


def item_written_off_qty(item: OrderItem) -> int:
    """Σ Return.qty где disposition = write_off (списано, чистый убыток)."""
    return sum(
        r.qty for r in item.returns.all()
        if r.disposition == Return.DISPOSITION_WRITE_OFF
    )


def item_sold_qty(item: OrderItem) -> int:
    """Продано = qty − возвращено (§4.1)."""
    return item.qty - item_returned_qty(item)


# --- Денежные показатели позиции (§4.1) --------------------------------------
def item_revenue(item: OrderItem) -> Decimal:
    """Выручка позиции = sale_price × продано."""
    return money(item.sale_price * item_sold_qty(item))


def item_cost(item: OrderItem) -> Decimal:
    """
    Себестоимость позиции = cost_kzt × (продано + списано).

    За брак (write_off) платим, но выручки нет → убыток. Возвраты restocked и
    supplier_refund себес исключают (актив сохранён / деньги вернулись).
    """
    units = item_sold_qty(item) + item_written_off_qty(item)
    return money(item.cost_kzt * units)


def item_delivery(item: OrderItem) -> Decimal:
    """Доставка позиции = delivery_price × qty. В прибыль НЕ входит (транзит)."""
    return money(item.delivery_price * item.qty)


# --- Прибыль и расчёт заказа (§4.1) ------------------------------------------
def order_calculation(order: Order) -> dict:
    """
    Полный расчёт заказа (§4.1):

        ПРИБЫЛЬ = выручка − себестоимость − доп_расходы

    Доставка считается отдельно (в прибыль не входит) и нужна для «к оплате».
    """
    items = list(order.items.all())
    revenue = sum((item_revenue(i) for i in items), ZERO)
    cost = sum((item_cost(i) for i in items), ZERO)
    delivery = sum((item_delivery(i) for i in items), ZERO)
    extra = sum((e.amount for e in order.expenses.all()), ZERO)
    profit = money(revenue - cost - extra)
    return {
        "revenue": money(revenue),
        "cost": money(cost),
        "delivery": money(delivery),
        "extra_expenses": money(extra),
        "profit": profit,
        # к оплате клиентом по этому заказу = выручка + доставка (§4.2)
        "due": money(revenue + delivery),
    }


def order_profit(order: Order) -> Decimal:
    """Прибыль заказа (§4.1)."""
    return order_calculation(order)["profit"]


def order_paid(order: Order) -> Decimal:
    """
    Оплачено по заказу = Σ платежей (deposit) с привязкой к заказу − Σ возвратов
    (refund) по нему. Учитываются только движения с явной привязкой order (§4.2).
    """
    total = ZERO
    for m in order.payments.all():
        if m.direction == "deposit":
            total += m.amount
        else:
            total -= m.amount
    return money(total)


# --- Статус и выдача (§4.4) --------------------------------------------------
def is_order_completed(order: Order) -> bool:
    """Завершённый заказ = все позиции выданы полностью (§4.7)."""
    items = list(order.items.all())
    if not items:
        return False
    return all(i.issued_qty >= i.qty for i in items)


def order_completed_at(order: Order):
    """
    Дата завершения заказа = когда он стал полностью выданным (§4.6).

    Берём время последнего события истории статуса с кодом issued; если истории
    нет (старые данные) — дату создания заказа. None — если не завершён.
    """
    if not is_order_completed(order):
        return None
    ev = order.status_events.filter(code=OrderItem.STATUS_ISSUED).order_by(
        "-created_at"
    ).first()
    return ev.created_at if ev else order.created_at


def order_status(order: Order) -> dict:
    """
    Вычисляемый общий статус заказа (§4.4):
    - все позиции issued → «Выдан»;
    - иначе — самый ранний прогресс среди позиций + сводка «выдано X из Y».
    """
    items = list(order.items.all())
    total_qty = sum(i.qty for i in items)
    issued_qty = sum(i.issued_qty for i in items)
    if not items:
        return {
            "code": "empty", "label": "Пустой", "issued_qty": 0,
            "total_qty": 0, "completed": False,
        }
    if all(i.status == OrderItem.STATUS_ISSUED for i in items):
        return {
            "code": OrderItem.STATUS_ISSUED, "label": "Выдан",
            "issued_qty": issued_qty, "total_qty": total_qty, "completed": True,
        }
    # самый ранний прогресс среди позиций
    earliest = min(
        items, key=lambda i: OrderItem.STATUS_ORDER.index(i.status)
    ).status
    label = dict(OrderItem.STATUS_CHOICES)[earliest]
    return {
        "code": earliest,
        "label": f"{label} · выдано {issued_qty} из {total_qty} ед.",
        "issued_qty": issued_qty,
        "total_qty": total_qty,
        "completed": False,
    }


def sync_order_status(order: Order) -> None:
    """
    Зафиксировать изменение статуса заказа в истории (§4.4).

    Сравнивает текущий вычисленный статус с последней записью и добавляет новую
    запись, если изменился этап (code) или прогресс выдачи (issued_qty). Шум от
    простого добавления позиций (рост total_qty) не логируется.
    """
    from .models import OrderStatusEvent

    st = order_status(order)
    if st["code"] == "empty":
        return
    last = order.status_events.first()  # ordering: -created_at
    if (
        last is not None
        and last.code == st["code"]
        and last.issued_qty == st["issued_qty"]
    ):
        return
    OrderStatusEvent.objects.create(
        order=order,
        code=st["code"],
        summary=st["label"],
        issued_qty=st["issued_qty"],
        total_qty=st["total_qty"],
    )


def apply_issue(item: OrderItem, issued_qty: int) -> OrderItem:
    """
    Применить выдачу (§4.4): установить issued_qty (0..qty).
    При issued_qty == qty статус автоматически становится issued.
    """
    item.issued_qty = issued_qty
    if issued_qty >= item.qty:
        item.issued_qty = item.qty
        item.status = OrderItem.STATUS_ISSUED
    return item
