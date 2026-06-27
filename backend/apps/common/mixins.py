"""Общие миксины для DRF-вьюсетов."""
from rest_framework import status
from rest_framework.response import Response


class NoDeleteMixin:
    """
    Запрещает физическое удаление (CLAUDE.md §8): финансовые записи нельзя
    удалять, только архивировать/сторнировать. Возвращает 405.
    """

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Финансовые записи нельзя удалять — только архивировать."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
