from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import ConfigurableModelPermissions

from .models import WarehouseItem
from .serializers import WarehouseItemSerializer
from .services import frozen_capital


class WarehouseItemViewSet(viewsets.ModelViewSet):
    """Склад (CLAUDE.md §7) + замороженный капитал (§4.5)."""

    queryset = WarehouseItem.objects.filter(is_archived=False)
    serializer_class = WarehouseItemSerializer
    permission_classes = [ConfigurableModelPermissions]
    search_fields = ["name", "country"]
    ordering_fields = ["created_at", "id", "name"]

    def perform_destroy(self, instance):
        # мягкое архивирование вместо удаления (§8)
        instance.is_archived = True
        instance.save(update_fields=["is_archived"])

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # итоговый замороженный капитал по всему складу
        response.data = response.data if isinstance(response.data, dict) else response.data
        if isinstance(response.data, dict):
            response.data["frozen_capital"] = frozen_capital()
        return response

    @action(detail=False, methods=["get"])
    def summary(self, request):
        return Response({"frozen_capital": frozen_capital()})
