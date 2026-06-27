from rest_framework import serializers

from .models import WarehouseItem


class WarehouseItemSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    full_cost = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseItem
        fields = [
            "id", "name", "country", "cost_foreign", "currency", "cost_kzt",
            "qty", "delivery_cost", "other_costs", "planned_price", "status",
            "status_display", "purchase_date", "delivery_date", "notes",
            "created_at", "full_cost",
        ]
        read_only_fields = ["created_at"]

    def get_full_cost(self, obj):
        return obj.full_cost

    def validate(self, attrs):
        pd = attrs.get("purchase_date", getattr(self.instance, "purchase_date", None))
        dd = attrs.get("delivery_date", getattr(self.instance, "delivery_date", None))
        if pd and dd and dd < pd:
            raise serializers.ValidationError(
                {"delivery_date": "Дата доставки раньше даты покупки."}
            )
        return attrs
