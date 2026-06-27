from rest_framework import serializers

from .models import Expense, ExpenseCategory, RecurringExpense


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ["id", "name", "is_recurring"]


class RecurringExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    method_display = serializers.CharField(source="get_method_display", read_only=True)

    class Meta:
        model = RecurringExpense
        fields = [
            "id", "name", "category", "category_name", "planned_amount",
            "method", "method_display", "is_active", "notes",
        ]

    def validate_planned_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Сумма не может быть отрицательной.")
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    recurring_name = serializers.CharField(source="recurring.name", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id", "category", "category_name", "amount", "method",
            "method_display", "comment", "expense_date", "period",
            "recurring", "recurring_name", "is_recurring",
        ]

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Сумма не может быть отрицательной.")
        return value
