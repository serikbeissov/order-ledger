from django.contrib import admin

from .models import BalanceMovement, Client


class BalanceMovementInline(admin.TabularInline):
    model = BalanceMovement
    extra = 0


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "birth_date", "is_archived", "created_at"]
    search_fields = ["full_name", "phone"]
    list_filter = ["is_archived"]
    inlines = [BalanceMovementInline]


@admin.register(BalanceMovement)
class BalanceMovementAdmin(admin.ModelAdmin):
    list_display = ["client", "direction", "amount", "method", "paid_at"]
    list_filter = ["direction", "method"]
    search_fields = ["client__full_name"]
