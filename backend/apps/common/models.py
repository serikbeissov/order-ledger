"""Базовые абстрактные модели и денежное поле."""
from django.db import models

MONEY_KWARGS = {"max_digits": 12, "decimal_places": 2}


class MoneyField(models.DecimalField):
    """Денежное поле: Decimal(12,2), значение ≥ 0 валидируется в сериализаторах."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_digits", 12)
        kwargs.setdefault("decimal_places", 2)
        super().__init__(*args, **kwargs)


class TimeStampedModel(models.Model):
    """Метка времени создания (для исторических записей)."""

    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        abstract = True


class ArchivableModel(models.Model):
    """
    Мягкое архивирование вместо физического удаления.

    Финансовые записи нельзя удалять физически (CLAUDE.md §8/§10) — только
    помечать is_archived.
    """

    is_archived = models.BooleanField("В архиве", default=False)

    class Meta:
        abstract = True
