from rest_framework import viewsets

from apps.accounts.permissions import IsAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Журнал аудита — только чтение, только администратор (CLAUDE.md §3.3, §8)."""

    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    search_fields = ["object_repr", "username", "model_label"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("model"):
            qs = qs.filter(model=p["model"])
        if p.get("action"):
            qs = qs.filter(action=p["action"])
        if p.get("user"):
            qs = qs.filter(user_id=p["user"])
        if p.get("date_from"):
            qs = qs.filter(created_at__date__gte=p["date_from"])
        if p.get("date_to"):
            qs = qs.filter(created_at__date__lte=p["date_to"])
        return qs
