from decimal import Decimal

from rest_framework import serializers

from apps.common.money import money

from .models import Order, OrderExpense, OrderItem, Return
from .services import (
    item_delivery,
    item_returned_qty,
    item_revenue,
    item_sold_qty,
    order_calculation,
    order_status,
)


class ReturnSerializer(serializers.ModelSerializer):
    disposition_display = serializers.CharField(
        source="get_disposition_display", read_only=True
    )

    class Meta:
        model = Return
        fields = [
            "id", "order_item", "qty", "disposition", "disposition_display",
            "refund_amount", "return_date", "comment",
        ]
        read_only_fields = ["order_item"]

    def validate_qty(self, value):
        if value < 1:
            raise serializers.ValidationError("Количество должно быть ≥ 1.")
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    returns = ReturnSerializer(many=True, read_only=True)
    returned_qty = serializers.SerializerMethodField()
    sold_qty = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()
    delivery = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "order", "warehouse_item", "name", "cost_foreign", "currency",
            "cost_kzt", "qty", "issued_qty", "sale_price", "delivery_price",
            "country", "site", "track_number", "status", "status_display",
            "purchase_date", "delivery_date", "returns",
            "returned_qty", "sold_qty", "revenue", "delivery",
        ]
        read_only_fields = ["order"]

    def get_returned_qty(self, obj):
        return item_returned_qty(obj)

    def get_sold_qty(self, obj):
        return item_sold_qty(obj)

    def get_revenue(self, obj):
        return item_revenue(obj)

    def get_delivery(self, obj):
        return item_delivery(obj)

    def validate(self, attrs):
        qty = attrs.get("qty", getattr(self.instance, "qty", 1))
        issued = attrs.get("issued_qty", getattr(self.instance, "issued_qty", 0))
        if qty < 1:
            raise serializers.ValidationError({"qty": "Количество должно быть ≥ 1."})
        if not (0 <= issued <= qty):
            raise serializers.ValidationError(
                {"issued_qty": "Выдано должно быть в диапазоне [0, qty]."}
            )
        # дата доставки ≥ даты покупки (предупреждение, §8)
        pd = attrs.get("purchase_date", getattr(self.instance, "purchase_date", None))
        dd = attrs.get("delivery_date", getattr(self.instance, "delivery_date", None))
        if pd and dd and dd < pd:
            raise serializers.ValidationError(
                {"delivery_date": "Дата доставки раньше даты покупки."}
            )
        return attrs


class OrderExpenseSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = OrderExpense
        fields = ["id", "order", "type", "type_display", "amount", "comment"]
        read_only_fields = ["order"]

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Сумма не может быть отрицательной.")
        return value


class OrderListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    profit = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "client", "client_name", "is_archived", "created_at",
            "profit", "status",
        ]

    def get_profit(self, obj):
        return order_calculation(obj)["profit"]

    def get_status(self, obj):
        return order_status(obj)


class OrderDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    expenses = OrderExpenseSerializer(many=True, read_only=True)
    calculation = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    client_balance = serializers.SerializerMethodField()
    tax_hint = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "client", "client_name", "created_by", "notes", "is_archived",
            "created_at", "items", "expenses", "calculation", "status",
            "client_balance", "tax_hint",
        ]
        read_only_fields = ["created_at", "created_by"]

    def get_calculation(self, obj):
        return order_calculation(obj)

    def get_status(self, obj):
        return order_status(obj)

    def get_client_balance(self, obj):
        from apps.clients.services import client_balance

        return client_balance(obj.client)

    def get_tax_hint(self, obj):
        """Подсказка налога 4% (§4.3): 0.04 × Σ пополнений клиента через терминал."""
        from apps.clients.models import BalanceMovement

        terminal = sum(
            (m.amount for m in obj.client.movements.filter(
                method=BalanceMovement.METHOD_TERMINAL,
                direction=BalanceMovement.DIRECTION_DEPOSIT)),
            Decimal("0"),
        )
        return money(terminal * Decimal("0.04"))
