from django.db import models

from apps.common.models import MoneyField


class ExpenseCategory(models.Model):
    """
    Справочник категорий постоянных расходов (CLAUDE.md §3.2).

    Расширяется в админке: СММ, Аренда, Зарплата, Браки, Налоги, Прочее.
    Вложения инвесторов ведутся отдельной сущностью Investment, а не категорией,
    чтобы не задвоить учёт.
    """

    name = models.CharField("Название", max_length=100, unique=True)
    is_recurring = models.BooleanField("Ежемесячная", default=False)

    class Meta:
        verbose_name = "Категория расходов"
        verbose_name_plural = "Категории расходов"
        ordering = ["name"]

    def __str__(self):
        return self.name


METHOD_CASH = "cash"
METHOD_CARD = "card"
METHOD_TERMINAL = "terminal"
METHOD_CHOICES = [
    (METHOD_CASH, "Наличные"),
    (METHOD_CARD, "Карта"),
    (METHOD_TERMINAL, "Терминал"),
]


class RecurringExpense(models.Model):
    """
    Ежемесячное напоминание о расходе (CLAUDE.md §11, этап 4).

    Это НЕ факт выплаты, а пункт-напоминалка, который владелец заводит сам:
    что платим каждый месяц (аренда, зарплата, СММ…) и ориентир суммы. Факт
    выдачи записывается как Expense; напоминание гаснет, когда за месяц есть
    соответствующий Expense (по ссылке `recurring` или совпадению категории).
    """

    name = models.CharField("Название", max_length=150)
    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="recurring",
        verbose_name="Категория",
    )
    planned_amount = MoneyField("Ориентир суммы", null=True, blank=True)
    method = models.CharField(
        "Способ (обычно)", max_length=10, choices=METHOD_CHOICES, default=METHOD_CASH
    )
    is_active = models.BooleanField("Активно", default=True)
    notes = models.TextField("Заметка", blank=True)

    class Meta:
        verbose_name = "Ежемесячное напоминание"
        verbose_name_plural = "Ежемесячные напоминания"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Expense(models.Model):
    """Общебизнесовый постоянный расход по категории (CLAUDE.md §3.2, §4.6)."""

    METHOD_CASH = METHOD_CASH
    METHOD_CARD = METHOD_CARD
    METHOD_TERMINAL = METHOD_TERMINAL
    METHOD_CHOICES = METHOD_CHOICES

    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="expenses",
        verbose_name="Категория",
    )
    recurring = models.ForeignKey(
        RecurringExpense, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payments", verbose_name="Гасит напоминание",
    )
    amount = MoneyField("Сумма")
    method = models.CharField(
        "Способ", max_length=10, choices=METHOD_CHOICES, default=METHOD_CASH
    )
    comment = models.TextField("Комментарий", blank=True)
    expense_date = models.DateField("Дата выдачи")
    # «За какой месяц» расход (напр. зарплата за июнь) — первое число месяца.
    # Справочно; P&L (§4.6) считает по expense_date.
    period = models.DateField("За какой месяц", null=True, blank=True)
    is_recurring = models.BooleanField("Ежемесячный", default=False)

    class Meta:
        verbose_name = "Постоянный расход"
        verbose_name_plural = "Постоянные расходы"
        ordering = ["-expense_date", "-id"]

    def __str__(self):
        return f"{self.category}: {self.amount} ₸"
