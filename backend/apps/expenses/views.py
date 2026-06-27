from rest_framework import viewsets

from apps.accounts.permissions import IsManagerOrAdmin

from .models import Expense, ExpenseCategory
from .serializers import ExpenseCategorySerializer, ExpenseSerializer


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """Категории расходов — менеджер/админ (CLAUDE.md §3.3)."""

    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsManagerOrAdmin]


class ExpenseViewSet(viewsets.ModelViewSet):
    """Постоянные расходы — менеджер/админ (CLAUDE.md §3.3, §4.6)."""

    queryset = Expense.objects.select_related("category").all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsManagerOrAdmin]
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
