from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GroupViewSet,
    LoginView,
    LogoutView,
    UserViewSet,
    me,
    permissions_catalog,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("groups", GroupViewSet, basename="group")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", me, name="me"),
    path("permissions/", permissions_catalog, name="permissions-catalog"),
    path("", include(router.urls)),
]
