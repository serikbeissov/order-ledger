from django.contrib import admin

from .models import Investment, Investor, Reserve, ReserveMovement


class InvestmentInline(admin.TabularInline):
    model = Investment
    extra = 0


class ReserveMovementInline(admin.TabularInline):
    model = ReserveMovement
    extra = 0


@admin.register(Investor)
class InvestorAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]
    inlines = [InvestmentInline]


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ["investor", "direction", "amount", "method", "moved_at"]
    list_filter = ["direction", "method"]


@admin.register(Reserve)
class ReserveAdmin(admin.ModelAdmin):
    list_display = ["name", "kind", "target_amount"]
    list_filter = ["kind"]
    inlines = [ReserveMovementInline]


admin.site.register(ReserveMovement)
