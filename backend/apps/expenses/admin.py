from django.contrib import admin

from .models import Expense, ExpenseCategory


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "is_recurring"]
    list_filter = ["is_recurring"]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["category", "amount", "expense_date", "is_recurring"]
    list_filter = ["category", "is_recurring"]
    date_hierarchy = "expense_date"
