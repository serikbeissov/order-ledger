from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    Запись аудита: кто, когда и что изменил (CLAUDE.md §8 — финансовый учёт).

    Пишется автоматически по сигналам моделей. `changes` — JSON с разницей полей
    {поле: {"from": .., "to": ..}} для изменений или {"to": ..} для создания.
    """

    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_CHOICES = [
        (ACTION_CREATE, "Создание"),
        (ACTION_UPDATE, "Изменение"),
        (ACTION_DELETE, "Удаление"),
    ]

    created_at = models.DateTimeField("Когда", auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="audit_logs", verbose_name="Кто",
    )
    username = models.CharField("Логин (снимок)", max_length=150, blank=True)
    action = models.CharField("Действие", max_length=10, choices=ACTION_CHOICES)
    app_label = models.CharField("Приложение", max_length=100)
    model = models.CharField("Модель", max_length=100)
    model_label = models.CharField("Сущность", max_length=150, blank=True)
    object_id = models.CharField("ID объекта", max_length=64, blank=True)
    object_repr = models.CharField("Объект", max_length=255, blank=True)
    changes = models.JSONField("Изменения", default=dict, blank=True)

    class Meta:
        verbose_name = "Запись аудита"
        verbose_name_plural = "Аудит изменений"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["model", "object_id"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.get_action_display()} {self.model_label} #{self.object_id}"
