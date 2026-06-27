from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import ConfigurableModelPermissions
from apps.common.export import csv_response
from apps.common.mixins import NoDeleteMixin

from .models import Expense, ExpenseCategory, RecurringExpense
from .serializers import (
    ExpenseCategorySerializer,
    ExpenseSerializer,
    RecurringExpenseSerializer,
)
from .services import recurring_due


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """Категории расходов — менеджер/админ (CLAUDE.md §3.3)."""

    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [ConfigurableModelPermissions]


class RecurringExpenseViewSet(viewsets.ModelViewSet):
    """Ежемесячные напоминания о расходах — менеджер/админ (CLAUDE.md §3.3)."""

    queryset = RecurringExpense.objects.select_related("category").all()
    serializer_class = RecurringExpenseSerializer
    permission_classes = [ConfigurableModelPermissions]
    ordering_fields = ["name"]


class ExpenseViewSet(NoDeleteMixin, viewsets.ModelViewSet):
    """Постоянные расходы — менеджер/админ (CLAUDE.md §3.3, §4.6).

    Удаление запрещено (§8): фактические выплаты не удаляются.
    """

    queryset = Expense.objects.select_related("category").all()
    serializer_class = ExpenseSerializer
    permission_classes = [ConfigurableModelPermissions]
    ordering_fields = ["expense_date", "amount"]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("date_from"):
            qs = qs.filter(expense_date__gte=params["date_from"])
        if params.get("date_to"):
            qs = qs.filter(expense_date__lte=params["date_to"])
        return qs

    @action(detail=False, methods=["get"])
    def export(self, request):
        """CSV-экспорт фактических расходов."""
        rows = [
            [
                e.expense_date.isoformat(),
                e.period.strftime("%Y-%m") if e.period else "",
                e.category.name, e.get_method_display(), e.amount, e.comment,
            ]
            for e in self.get_queryset()
        ]
        return csv_response(
            "expenses.csv",
            ["Выдано", "За месяц", "Категория", "Способ", "Сумма", "Комментарий"],
            rows,
        )

    @action(detail=False, methods=["get"])
    def recurring_due(self, request):
        """
        GET /api/expenses/recurring_due/?period=YYYY-MM — регулярные категории,
        ещё не оплаченные за месяц (для напоминания).
        """
        period = request.query_params.get("period")
        return Response({"period": period, "due": recurring_due(period)})
