"""Агрегированный API-роутер order-ledger (CLAUDE.md §7)."""
from django.urls import include, path

urlpatterns = [
    path("", include("apps.accounts.urls")),
    path("", include("apps.clients.urls")),
    path("", include("apps.orders.urls")),
    path("", include("apps.warehouse.urls")),
    path("", include("apps.expenses.urls")),
    path("", include("apps.finance.urls")),
    path("", include("apps.dashboard.urls")),
    path("", include("apps.audit.urls")),
]
