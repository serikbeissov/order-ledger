from django.contrib import admin

from .models import Expense, ExpenseCategory, RecurringExpense


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "is_recurring"]
    list_filter = ["is_recurring"]


@admin.register(RecurringExpense)
class RecurringExpenseAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "planned_amount", "method", "is_active"]
    list_filter = ["is_active", "category"]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = [
        "category", "amount", "method", "expense_date", "period", "is_recurring",
    ]
    list_filter = ["category", "method", "is_recurring"]
    date_hierarchy = "expense_date"
