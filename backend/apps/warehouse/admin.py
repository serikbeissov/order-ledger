from django.contrib import admin

from .models import WarehouseItem


@admin.register(WarehouseItem)
class WarehouseItemAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "qty", "cost_kzt", "planned_price"]
    list_filter = ["status", "country"]
    search_fields = ["name"]
