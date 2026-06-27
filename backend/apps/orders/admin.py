from django.contrib import admin

from .models import Order, OrderExpense, OrderItem, OrderStatusEvent, Return


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


class OrderExpenseInline(admin.TabularInline):
    model = OrderExpense
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "client", "created_by", "is_archived", "created_at"]
    list_filter = ["is_archived"]
    search_fields = ["client__full_name", "notes"]
    inlines = [OrderItemInline, OrderExpenseInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["name", "order", "qty", "issued_qty", "status", "sale_price"]
    list_filter = ["status"]
    search_fields = ["name", "track_number"]


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ["order_item", "qty", "disposition", "refund_amount", "return_date"]
    list_filter = ["disposition"]


admin.site.register(OrderExpense)


@admin.register(OrderStatusEvent)
class OrderStatusEventAdmin(admin.ModelAdmin):
    list_display = ["order", "summary", "issued_qty", "total_qty", "created_at"]
    list_filter = ["code"]
