from django.db import models

from apps.common.models import MoneyField, TimeStampedModel


class WarehouseItem(TimeStampedModel):
    """
    Карточка складского товара (CLAUDE.md §3.2, §4.5).

    Товар куплен на свои деньги под реализацию — деньги «заморожены», пока он
    in_stock/reserved. При продаже → sold + связь с позицией заказа; при возврате
    на склад (Return.restocked) создаётся/инкрементится.
    """

    STATUS_IN_STOCK = "in_stock"
    STATUS_RESERVED = "reserved"
    STATUS_SOLD = "sold"
    STATUS_CHOICES = [
        (STATUS_IN_STOCK, "В наличии"),
        (STATUS_RESERVED, "Зарезервирован"),
        (STATUS_SOLD, "Продан"),
    ]

    name = models.CharField("Наименование", max_length=255)
    country = models.CharField("Страна", max_length=100, blank=True)
    cost_foreign = MoneyField("Себестоимость (валюта)", null=True, blank=True)
    currency = models.CharField("Валюта", max_length=10, blank=True)
    cost_kzt = MoneyField("Себестоимость (₸)")
    qty = models.PositiveIntegerField("Количество", default=1)
    delivery_cost = MoneyField("Доставка (всего)", default=0)
    other_costs = MoneyField("Прочие затраты", default=0)
    planned_price = MoneyField("Плановая цена продажи", default=0)
    status = models.CharField(
        "Статус", max_length=10, choices=STATUS_CHOICES, default=STATUS_IN_STOCK
    )
    purchase_date = models.DateField("Дата покупки", null=True, blank=True)
    delivery_date = models.DateField("Дата доставки", null=True, blank=True)
    notes = models.TextField("Заметки", blank=True)

    class Meta:
        verbose_name = "Складской товар"
        verbose_name_plural = "Склад"
        ordering = ["-id"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    @property
    def full_cost(self):
        """Полная затрата на позицию: cost_kzt × qty + доставка + прочее (§4.5)."""
        from apps.common.money import money

        return money(self.cost_kzt * self.qty + self.delivery_cost + self.other_costs)
