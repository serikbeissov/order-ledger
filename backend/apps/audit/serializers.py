from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "created_at", "user", "username", "action", "action_display",
            "app_label", "model", "model_label", "object_id", "object_repr",
            "changes",
        ]
