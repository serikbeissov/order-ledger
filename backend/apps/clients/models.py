from django.db import models

from apps.common.models import ArchivableModel, MoneyField, TimeStampedModel


class Client(ArchivableModel, TimeStampedModel):
    """Покупатель. Баланс не хранится полем — вычисляется (CLAUDE.md §4.2)."""

    full_name = models.CharField("ФИО", max_length=255)
    phone = models.CharField("Телефон", max_length=20, blank=True)
    birth_date = models.DateField("Дата рождения", null=True, blank=True)
    notes = models.TextField("Заметки", blank=True)

    class Meta:
        verbose_name = "Клиент"
        verbose_name_plural = "Клиенты"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class BalanceMovement(TimeStampedModel):
    """
    Движение по балансу клиента (CLAUDE.md §3.2).

    direction=deposit — клиент внёс; direction=refund — мы вернули деньги клиенту.
    Финансовая запись — физически не удаляется (§8).
    """

    DIRECTION_DEPOSIT = "deposit"
    DIRECTION_REFUND = "refund"
    DIRECTION_CHOICES = [
        (DIRECTION_DEPOSIT, "Пополнение"),
        (DIRECTION_REFUND, "Возврат клиенту"),
    ]

    METHOD_CASH = "cash"
    METHOD_CARD = "card"
    METHOD_TERMINAL = "terminal"
    METHOD_CHOICES = [
        (METHOD_CASH, "Наличные"),
        (METHOD_CARD, "Карта"),
        (METHOD_TERMINAL, "Терминал"),
    ]

    client = models.ForeignKey(
        Client, on_delete=models.PROTECT, related_name="movements",
        verbose_name="Клиент",
    )
    # необязательная привязка платежа к конкретному заказу (§4.2)
    order = models.ForeignKey(
        "orders.Order", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payments", verbose_name="Заказ",
    )
    direction = models.CharField(
        "Направление", max_length=10, choices=DIRECTION_CHOICES
    )
    amount = MoneyField("Сумма")
    method = models.CharField(
        "Способ", max_length=10, choices=METHOD_CHOICES, default=METHOD_CASH
    )
    comment = models.TextField("Комментарий", blank=True)
    paid_at = models.DateField("Дата операции")

    class Meta:
        verbose_name = "Движение по балансу"
        verbose_name_plural = "Движения по балансу"
        ordering = ["-paid_at", "-id"]

    def __str__(self):
        return f"{self.get_direction_display()} {self.amount} ₸ — {self.client}"
