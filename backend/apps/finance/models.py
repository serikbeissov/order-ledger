from django.db import models

from apps.common.models import MoneyField


class Investor(models.Model):
    """Инвестор (CLAUDE.md §3.2)."""

    name = models.CharField("Имя", max_length=255)
    notes = models.TextField("Заметки", blank=True)

    class Meta:
        verbose_name = "Инвестор"
        verbose_name_plural = "Инвесторы"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Investment(models.Model):
    """
    Вложение инвестора (CLAUDE.md §3.2, §4.7).

    direction=in — вложили в бизнес; direction=return — вернули инвестору.
    Пул «Инвестиции» = Σ in − Σ return.
    """

    DIRECTION_IN = "in"
    DIRECTION_RETURN = "return"
    DIRECTION_CHOICES = [
        (DIRECTION_IN, "Вложение"),
        (DIRECTION_RETURN, "Возврат инвестору"),
    ]

    METHOD_CASH = "cash"
    METHOD_CARD = "card"
    METHOD_TERMINAL = "terminal"
    METHOD_CHOICES = [
        (METHOD_CASH, "Наличные"),
        (METHOD_CARD, "Карта"),
        (METHOD_TERMINAL, "Терминал"),
    ]

    investor = models.ForeignKey(
        Investor, on_delete=models.PROTECT, related_name="investments",
        verbose_name="Инвестор",
    )
    direction = models.CharField("Направление", max_length=10, choices=DIRECTION_CHOICES)
    amount = MoneyField("Сумма")
    method = models.CharField(
        "Способ", max_length=10, choices=METHOD_CHOICES, default=METHOD_CASH
    )
    comment = models.TextField("Комментарий", blank=True)
    moved_at = models.DateField("Дата")

    class Meta:
        verbose_name = "Вложение / возврат инвестора"
        verbose_name_plural = "Вложения инвесторов"
        ordering = ["-moved_at", "-id"]

    def __str__(self):
        return f"{self.get_direction_display()} {self.amount} ₸ — {self.investor}"


class Reserve(models.Model):
    """
    Резерв-«конверт» (CLAUDE.md §3.2, §4.7).

    Виртуальный конверт внутри денег компании под будущие обязательства.
    kind: tax (налоги), monthly (ежемесячные расходы), other.
    Текущий резерв = Σ set_aside − Σ release.
    """

    KIND_TAX = "tax"
    KIND_MONTHLY = "monthly"
    KIND_OTHER = "other"
    KIND_CHOICES = [
        (KIND_TAX, "На налоги"),
        (KIND_MONTHLY, "На ежемесячные расходы"),
        (KIND_OTHER, "Прочее"),
    ]

    name = models.CharField("Название", max_length=100)
    kind = models.CharField("Тип", max_length=10, choices=KIND_CHOICES, default=KIND_OTHER)
    target_amount = MoneyField("Цель (опц.)", null=True, blank=True)
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        verbose_name = "Резерв"
        verbose_name_plural = "Резервы"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_kind_display()})"


class ReserveMovement(models.Model):
    """Движение по резерву: отложить (set_aside) / снять (release) (§4.7)."""

    DIRECTION_SET_ASIDE = "set_aside"
    DIRECTION_RELEASE = "release"
    DIRECTION_CHOICES = [
        (DIRECTION_SET_ASIDE, "Отложить"),
        (DIRECTION_RELEASE, "Снять"),
    ]

    reserve = models.ForeignKey(
        Reserve, on_delete=models.CASCADE, related_name="movements",
        verbose_name="Резерв",
    )
    direction = models.CharField("Направление", max_length=10, choices=DIRECTION_CHOICES)
    amount = MoneyField("Сумма")
    comment = models.TextField("Комментарий", blank=True)
    moved_at = models.DateField("Дата")

    class Meta:
        verbose_name = "Движение по резерву"
        verbose_name_plural = "Движения по резервам"
        ordering = ["-moved_at", "-id"]

    def __str__(self):
        return f"{self.get_direction_display()} {self.amount} ₸ — {self.reserve}"
