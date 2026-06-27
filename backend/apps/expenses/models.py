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


class Expense(models.Model):
    """Общебизнесовый постоянный расход по категории (CLAUDE.md §3.2, §4.6)."""

    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="expenses",
        verbose_name="Категория",
    )
    amount = MoneyField("Сумма")
    comment = models.TextField("Комментарий", blank=True)
    expense_date = models.DateField("Дата расхода")
    is_recurring = models.BooleanField("Ежемесячный", default=False)

    class Meta:
        verbose_name = "Постоянный расход"
        verbose_name_plural = "Постоянные расходы"
        ordering = ["-expense_date", "-id"]

    def __str__(self):
        return f"{self.category}: {self.amount} ₸"
