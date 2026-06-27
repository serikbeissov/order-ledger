from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsManagerOrAdmin

from .models import Investment, Investor, Reserve
from .serializers import (
    InvestmentSerializer,
    InvestorSerializer,
    ReserveMovementSerializer,
    ReserveSerializer,
)
from .services import investments_pool


class InvestorViewSet(viewsets.ModelViewSet):
    """Инвесторы — менеджер/админ (CLAUDE.md §3.3)."""

    queryset = Investor.objects.all()
    serializer_class = InvestorSerializer
    permission_classes = [IsManagerOrAdmin]
    search_fields = ["name"]


class InvestmentViewSet(viewsets.ModelViewSet):
    """Вложения/возвраты инвесторов + текущий пул (§4.7)."""

    queryset = Investment.objects.select_related("investor").all()
    serializer_class = InvestmentSerializer
    permission_classes = [IsManagerOrAdmin]
    ordering_fields = ["moved_at", "amount"]

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if isinstance(response.data, dict):
            response.data["pool"] = investments_pool()
        return response


class ReserveViewSet(viewsets.ModelViewSet):
    """Резервы-конверты — менеджер/админ (§4.7)."""

    queryset = Reserve.objects.all()
    serializer_class = ReserveSerializer
    permission_classes = [IsManagerOrAdmin]

    @action(detail=True, methods=["post"])
    def movements(self, request, pk=None):
        """POST /reserves/{id}/movements/ — отложить / снять (direction)."""
        reserve = self.get_object()
        serializer = ReserveMovementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reserve=reserve)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
