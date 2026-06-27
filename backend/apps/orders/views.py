from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import ConfigurableModelPermissions
from apps.common.export import csv_response
from apps.warehouse.models import WarehouseItem

from .models import Order, OrderItem, Return
from .serializers import (
    OrderDetailSerializer,
    OrderExpenseSerializer,
    OrderItemSerializer,
    OrderListSerializer,
    ReturnSerializer,
)
from .services import (
    apply_issue,
    item_returned_qty,
    order_calculation,
    order_status,
    sync_order_status,
)


class OrderViewSet(viewsets.ModelViewSet):
    """Заказы (CLAUDE.md §7): позиции, выдача, возвраты, доп. расходы."""

    queryset = Order.objects.all().select_related("client")
    permission_classes = [ConfigurableModelPermissions]
    search_fields = ["client__full_name", "notes"]
    ordering_fields = ["created_at", "id"]

    def get_serializer_class(self):
        if self.action == "list":
            return OrderListSerializer
        return OrderDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        client_id = self.request.query_params.get("client")
        if client_id:
            qs = qs.filter(client_id=client_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @staticmethod
    def _sell_warehouse_item(item: OrderItem):
        """
        Продажа со склада (§3.2, §4.5) с учётом количества:
        - продали >= остатка → весь лот помечается sold;
        - продали часть → уменьшаем остаток, лот остаётся in_stock.
        """
        wi = item.warehouse_item
        if not wi:
            return
        if item.qty >= wi.qty:
            wi.status = WarehouseItem.STATUS_SOLD
            wi.save(update_fields=["status"])
        else:
            wi.qty -= item.qty
            wi.save(update_fields=["qty"])

    @staticmethod
    def _return_to_warehouse(item: OrderItem):
        """Вернуть проданные со склада единицы при удалении позиции (§4.5)."""
        wi = item.warehouse_item
        if not wi:
            return
        wi.qty += item.qty
        wi.status = WarehouseItem.STATUS_IN_STOCK
        wi.save(update_fields=["qty", "status"])

    def perform_destroy(self, instance):
        instance.is_archived = True
        instance.save(update_fields=["is_archived"])

    @action(detail=False, methods=["get"])
    def export(self, request):
        """CSV-экспорт заказов (статус, выручка, прибыль)."""
        rows = []
        for o in self.filter_queryset(self.get_queryset()):
            calc = order_calculation(o)
            rows.append([
                o.id, o.client.full_name, order_status(o)["label"],
                calc["revenue"], calc["cost"], calc["profit"],
                o.created_at.date().isoformat(),
            ])
        return csv_response(
            "orders.csv",
            ["№", "Клиент", "Статус", "Выручка", "Себестоимость", "Прибыль", "Создан"],
            rows,
        )

    # --- позиции -------------------------------------------------------------
    @action(detail=True, methods=["post"])
    def items(self, request, pk=None):
        """POST /orders/{id}/items/ — добавить позицию."""
        order = self.get_object()
        serializer = OrderItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(order=order)
        self._sell_warehouse_item(item)
        sync_order_status(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True, methods=["patch", "delete"],
        url_path=r"items/(?P<iid>[^/.]+)",
    )
    def item_detail(self, request, pk=None, iid=None):
        """PATCH/DELETE /orders/{id}/items/{iid}/."""
        order = self.get_object()
        item = get_object_or_404(OrderItem, pk=iid, order=order)
        if request.method == "DELETE":
            # вернуть проданный со склада товар обратно перед удалением
            self._return_to_warehouse(item)
            item.delete()
            sync_order_status(order)
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = OrderItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        sync_order_status(order)
        return Response(serializer.data)

    @action(
        detail=True, methods=["post"],
        url_path=r"items/(?P<iid>[^/.]+)/issue",
    )
    def issue(self, request, pk=None, iid=None):
        """POST /orders/{id}/items/{iid}/issue/ — частичная/полная выдача (§4.4)."""
        order = self.get_object()
        item = get_object_or_404(OrderItem, pk=iid, order=order)
        try:
            issued_qty = int(request.data.get("issued_qty"))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Укажите issued_qty (целое число)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not (0 <= issued_qty <= item.qty):
            return Response(
                {"detail": "issued_qty должно быть в диапазоне [0, qty]."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        apply_issue(item, issued_qty)
        item.save(update_fields=["issued_qty", "status"])
        sync_order_status(order)
        return Response(OrderItemSerializer(item).data)

    @action(
        detail=True, methods=["post"],
        url_path=r"items/(?P<iid>[^/.]+)/returns",
    )
    def returns(self, request, pk=None, iid=None):
        """POST /orders/{id}/items/{iid}/returns/ — оформить возврат (§4.1)."""
        order = self.get_object()
        item = get_object_or_404(OrderItem, pk=iid, order=order)
        serializer = ReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        qty = serializer.validated_data["qty"]

        # нельзя вернуть больше, чем куплено: Σ Return.qty ≤ qty (§8)
        if item_returned_qty(item) + qty > item.qty:
            return Response(
                {"detail": "Нельзя вернуть больше, чем в позиции."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # refund_amount по умолчанию = sale_price × qty (§3.2)
        refund_amount = serializer.validated_data.get("refund_amount")
        if not refund_amount:
            refund_amount = item.sale_price * qty

        ret = serializer.save(order_item=item, refund_amount=refund_amount)

        # restocked → создаём/пополняем складскую позицию (§4.1, §4.5)
        if ret.disposition == Return.DISPOSITION_RESTOCKED:
            self._restock(item, qty)

        sync_order_status(order)
        return Response(ReturnSerializer(ret).data, status=status.HTTP_201_CREATED)

    @staticmethod
    def _restock(item: OrderItem, qty: int):
        """
        Вернуть товар (и капитал) на склад (§4.5). Если есть привязка — пополняем
        её; иначе ищем существующую карточку того же товара (дедуп), и только
        если не нашли — создаём новую.
        """
        wi = item.warehouse_item
        if not wi:
            wi = WarehouseItem.objects.filter(
                is_archived=False,
                name__iexact=item.name,
                cost_kzt=item.cost_kzt,
            ).exclude(status=WarehouseItem.STATUS_SOLD).first()
        if wi:
            wi.qty += qty
            wi.status = WarehouseItem.STATUS_IN_STOCK
            wi.save(update_fields=["qty", "status"])
        else:
            WarehouseItem.objects.create(
                name=item.name,
                country=item.country,
                cost_foreign=item.cost_foreign,
                currency=item.currency,
                cost_kzt=item.cost_kzt,
                qty=qty,
                planned_price=item.sale_price,
                status=WarehouseItem.STATUS_IN_STOCK,
                purchase_date=item.purchase_date,
                delivery_date=item.delivery_date,
                notes=f"Возврат из заказа №{item.order_id}",
            )

    # --- доп. расходы --------------------------------------------------------
    @action(detail=True, methods=["post"])
    def expenses(self, request, pk=None):
        """POST /orders/{id}/expenses/ — доп. расход (+ подсказка налога §4.3)."""
        order = self.get_object()
        serializer = OrderExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(order=order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
