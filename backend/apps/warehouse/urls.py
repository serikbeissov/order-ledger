from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WarehouseItemViewSet

router = DefaultRouter()
router.register("warehouse", WarehouseItemViewSet, basename="warehouse")

urlpatterns = [path("", include(router.urls))]
