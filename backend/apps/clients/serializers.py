from rest_framework import serializers

from apps.common.phone import normalize_kz_phone

from .models import BalanceMovement, Client
from .services import client_balance, client_deposits, client_due, client_refunds


class BalanceMovementSerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(
        source="get_direction_display", read_only=True
    )
    method_display = serializers.CharField(source="get_method_display", read_only=True)

    class Meta:
        model = BalanceMovement
        fields = [
            "id", "client", "direction", "direction_display", "amount",
            "method", "method_display", "comment", "paid_at", "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Сумма не может быть отрицательной.")
        return value


class ClientListSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id", "full_name", "phone", "birth_date", "is_archived", "balance",
        ]

    def get_balance(self, obj):
        return client_balance(obj)


class ClientDetailSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()
    deposits = serializers.SerializerMethodField()
    refunds = serializers.SerializerMethodField()
    due = serializers.SerializerMethodField()
    movements = BalanceMovementSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "full_name", "phone", "birth_date", "notes", "is_archived",
            "created_at", "balance", "deposits", "refunds", "due", "movements",
        ]
        read_only_fields = ["created_at"]

    def get_balance(self, obj):
        return client_balance(obj)

    def get_deposits(self, obj):
        return client_deposits(obj)

    def get_refunds(self, obj):
        return client_refunds(obj)

    def get_due(self, obj):
        return client_due(obj)

    def validate_phone(self, value):
        return normalize_kz_phone(value)
