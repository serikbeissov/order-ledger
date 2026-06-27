from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ExpenseCategoryViewSet,
    ExpenseViewSet,
    RecurringExpenseViewSet,
)

router = DefaultRouter()
router.register("expense-categories", ExpenseCategoryViewSet, basename="expense-category")
router.register("recurring-expenses", RecurringExpenseViewSet, basename="recurring-expense")
router.register("expenses", ExpenseViewSet, basename="expense")

urlpatterns = [path("", include(router.urls))]
