from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsStaffNoDelete

from .models import Client
from .serializers import (
    BalanceMovementSerializer,
    ClientDetailSerializer,
    ClientListSerializer,
)


class ClientViewSet(viewsets.ModelViewSet):
    """
    Клиенты (CLAUDE.md §7). Финансовые записи не удаляются физически —
    архивирование (см. perform_destroy).
    """

    queryset = Client.objects.all()
    permission_classes = [IsStaffNoDelete]
    search_fields = ["full_name", "phone"]
    ordering_fields = ["full_name", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ClientListSerializer
        return ClientDetailSerializer

    def perform_destroy(self, instance):
        # мягкое архивирование вместо физического удаления (§8)
        instance.is_archived = True
        instance.save(update_fields=["is_archived"])

    @action(detail=True, methods=["post"])
    def movements(self, request, pk=None):
        """Пополнение или возврат клиенту (direction)."""
        client = self.get_object()
        data = {**request.data, "client": client.id}
        serializer = BalanceMovementSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
