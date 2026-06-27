from django.conf import settings
from django.db import models

from apps.clients.models import Client
from apps.common.models import ArchivableModel, MoneyField, TimeStampedModel
from apps.warehouse.models import WarehouseItem


class Order(ArchivableModel, TimeStampedModel):
    """
    Заказ — контейнер на одного клиента (CLAUDE.md §3.2).

    Общий статус и прибыль вычисляются из позиций (см. apps.orders.services).
    """

    client = models.ForeignKey(
        Client, on_delete=models.PROTECT, related_name="orders", verbose_name="Клиент"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="Оформил",
    )
    notes = models.TextField("Заметки", blank=True)

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ["-id"]

    def __str__(self):
        return f"Заказ №{self.pk} — {self.client}"


class OrderItem(models.Model):
    """
    Позиция заказа — ключевая сущность (CLAUDE.md §3.2).

    У каждой позиции свои страна, сайт, трек, статус, даты. issued_qty (0..qty) —
    частичная выдача (§4.4). Себес: cost_foreign+currency (справочно) и cost_kzt
    (для расчётов, вручную). delivery_price — за единицу.
    """

    STATUS_ORDERED = "ordered"
    STATUS_IN_TRANSIT = "in_transit"
    STATUS_RECEIVED = "received"
    STATUS_ISSUED = "issued"
    STATUS_CHOICES = [
        (STATUS_ORDERED, "Заказан"),
        (STATUS_IN_TRANSIT, "В пути"),
        (STATUS_RECEIVED, "Получен"),
        (STATUS_ISSUED, "Выдан"),
    ]
    # Порядок прогресса для вычисления общего статуса заказа (§4.4).
    STATUS_ORDER = [STATUS_ORDERED, STATUS_IN_TRANSIT, STATUS_RECEIVED, STATUS_ISSUED]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items", verbose_name="Заказ"
    )
    warehouse_item = models.ForeignKey(
        WarehouseItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
        verbose_name="Складской товар",
    )
    name = models.CharField("Наименование", max_length=255)
    cost_foreign = MoneyField("Себестоимость (валюта)", null=True, blank=True)
    currency = models.CharField("Валюта", max_length=10, blank=True)
    cost_kzt = MoneyField("Себестоимость (₸)")
    qty = models.PositiveIntegerField("Количество", default=1)
    issued_qty = models.PositiveIntegerField("Выдано единиц", default=0)
    sale_price = MoneyField("Цена продажи (за ед.)")
    delivery_price = MoneyField("Доставка (за ед.)", default=0)
    country = models.CharField("Страна", max_length=100, blank=True)
    site = models.CharField("Сайт", max_length=255, blank=True)
    track_number = models.CharField("Трек-номер", max_length=100, blank=True)
    status = models.CharField(
        "Статус", max_length=12, choices=STATUS_CHOICES, default=STATUS_ORDERED
    )
    purchase_date = models.DateField("Дата покупки", null=True, blank=True)
    delivery_date = models.DateField("Дата доставки", null=True, blank=True)

    class Meta:
        verbose_name = "Позиция заказа"
        verbose_name_plural = "Позиции заказа"
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} ×{self.qty}"


class OrderExpense(models.Model):
    """Доп. расход заказа: такси, налог (4%), комиссия банка, прочее (§3.2, §4.1)."""

    TYPE_TAXI = "taxi"
    TYPE_TAX = "tax"
    TYPE_BANK_FEE = "bank_fee"
    TYPE_OTHER = "other"
    TYPE_CHOICES = [
        (TYPE_TAXI, "Такси"),
        (TYPE_TAX, "Налог"),
        (TYPE_BANK_FEE, "Комиссия банка"),
        (TYPE_OTHER, "Прочее"),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="expenses", verbose_name="Заказ"
    )
    type = models.CharField(
        "Тип", max_length=10, choices=TYPE_CHOICES, default=TYPE_OTHER
    )
    amount = MoneyField("Сумма")
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Доп. расход заказа"
        verbose_name_plural = "Доп. расходы заказа"
        ordering = ["id"]

    def __str__(self):
        return f"{self.get_type_display()}: {self.amount} ₸"


class Return(models.Model):
    """
    Возврат — сдача товара клиентом (CLAUDE.md §3.2, §4.1).

    disposition:
      restocked       — вернули на склад (актив сохранён, себес исключается);
      supplier_refund — вернули поставщику (деньги вернулись, себес исключается);
      write_off       — списание/брак (деньги потеряны, себес остаётся → убыток).
    refund_amount — сколько вернули/зачли клиенту (по умолчанию sale_price × qty).
    """

    DISPOSITION_RESTOCKED = "restocked"
    DISPOSITION_SUPPLIER_REFUND = "supplier_refund"
    DISPOSITION_WRITE_OFF = "write_off"
    DISPOSITION_CHOICES = [
        (DISPOSITION_RESTOCKED, "На склад"),
        (DISPOSITION_SUPPLIER_REFUND, "Возврат поставщику"),
        (DISPOSITION_WRITE_OFF, "Списание / брак"),
    ]

    order_item = models.ForeignKey(
        OrderItem, on_delete=models.CASCADE, related_name="returns",
        verbose_name="Позиция заказа",
    )
    qty = models.PositiveIntegerField("Количество")
    disposition = models.CharField(
        "Что с товаром", max_length=16, choices=DISPOSITION_CHOICES
    )
    refund_amount = MoneyField("Сумма возврата клиенту", default=0)
    return_date = models.DateField("Дата возврата")
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Возврат"
        verbose_name_plural = "Возвраты"
        ordering = ["-return_date", "-id"]

    def __str__(self):
        return f"Возврат {self.qty} × {self.order_item.name}"
