from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InvestmentViewSet, InvestorViewSet, ReserveViewSet

router = DefaultRouter()
router.register("investors", InvestorViewSet, basename="investor")
router.register("investments", InvestmentViewSet, basename="investment")
router.register("reserves", ReserveViewSet, basename="reserve")

urlpatterns = [path("", include(router.urls))]
