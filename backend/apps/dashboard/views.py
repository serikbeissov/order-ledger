from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import HasDashboardAccess

from .services import dashboard_payload


@api_view(["GET"])
@permission_classes([HasDashboardAccess])
def dashboard(request):
    """
    GET /api/dashboard/?period=YYYY-MM — агрегаты §4.5–4.7,
    включая «Деньги на счету» с расшифровкой. Доступ — по праву
    `dashboard.view_dashboard` (настраивается админом).
    """
    period = request.query_params.get("period")
    return Response(dashboard_payload(period))
