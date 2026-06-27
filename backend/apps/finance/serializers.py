from rest_framework import serializers

from .models import Investment, Investor, Reserve, ReserveMovement
from .services import investments_pool, reserve_balance


class InvestmentSerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(
        source="get_direction_display", read_only=True
    )
    investor_name = serializers.CharField(source="investor.name", read_only=True)

    class Meta:
        model = Investment
        fields = [
            "id", "investor", "investor_name", "direction", "direction_display",
            "amount", "method", "comment", "moved_at",
        ]

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Сумма не может быть отрицательной.")
        return value

    def validate(self, attrs):
        from .services import investments_pool

        if attrs.get("direction") == Investment.DIRECTION_RETURN:
            if attrs["amount"] > investments_pool():
                raise serializers.ValidationError(
                    {"amount": "Возврат превышает текущий пул инвестиций."}
                )
        return attrs


class InvestorSerializer(serializers.ModelSerializer):
    investments = InvestmentSerializer(many=True, read_only=True)

    class Meta:
        model = Investor
        fields = ["id", "name", "notes", "investments"]


class ReserveMovementSerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(
        source="get_direction_display", read_only=True
    )

    class Meta:
        model = ReserveMovement
        fields = [
            "id", "reserve", "direction", "direction_display", "amount",
            "comment", "moved_at",
        ]
        read_only_fields = ["reserve"]

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Сумма не может быть отрицательной.")
        return value


class ReserveSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    balance = serializers.SerializerMethodField()
    movements = ReserveMovementSerializer(many=True, read_only=True)

    class Meta:
        model = Reserve
        fields = [
            "id", "name", "kind", "kind_display", "target_amount", "comment",
            "balance", "movements",
        ]

    def get_balance(self, obj):
        return reserve_balance(obj)
