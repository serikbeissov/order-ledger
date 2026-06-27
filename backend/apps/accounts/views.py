from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import Group, Permission, User
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdmin
from .serializers import GroupSerializer, LoginSerializer, UserSerializer

# Приложения, права которых выводятся в каталог для настройки ролей.
EXPOSED_APPS = [
    "clients", "orders", "warehouse", "expenses", "finance", "dashboard", "auth",
]
# В auth показываем только управление пользователями и ролями.
AUTH_MODELS = {"user", "group"}

ACTION_RU = {
    "view": "Просмотр",
    "add": "Создание",
    "change": "Изменение",
    "delete": "Удаление",
}
# Человекочитаемые названия сущностей (перекрывают англоязычные verbose_name).
MODEL_LABELS = {
    ("auth", "user"): "Пользователи",
    ("auth", "group"): "Роли (группы)",
    ("dashboard", "dashboardaccess"): "Дашборд",
}


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None or not user.is_active:
            return Response(
                {"detail": "Неверный логин или пароль."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """Текущий пользователь + роли и эффективные права (для гейтинга на фронте)."""
    return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """Управление пользователями — только администратор (CLAUDE.md §3.3)."""

    queryset = User.objects.all().order_by("username").prefetch_related("groups")
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]


class GroupViewSet(viewsets.ModelViewSet):
    """Роли (группы) и их права — только администратор (CLAUDE.md §3.3)."""

    queryset = Group.objects.all().order_by("name").prefetch_related("permissions")
    serializer_class = GroupSerializer
    permission_classes = [IsAdmin]


@api_view(["GET"])
@permission_classes([IsAdmin])
def permissions_catalog(request):
    """
    Каталог прав, сгруппированный по сущностям, с русскими подписями —
    для матрицы настройки ролей (просмотр/создание/изменение/удаление).
    """
    perms = (
        Permission.objects.select_related("content_type")
        .filter(content_type__app_label__in=EXPOSED_APPS)
    )
    order = {"view": 0, "add": 1, "change": 2, "delete": 3}
    by_ct: dict = {}
    for p in perms:
        ct = p.content_type
        if ct.app_label == "auth" and ct.model not in AUTH_MODELS:
            continue
        action = p.codename.split("_", 1)[0]
        if p.codename == "view_dashboard":
            action, action_label = "view", "Доступ"
        else:
            action_label = ACTION_RU.get(action, p.name)
        by_ct.setdefault(ct.id, {"ct": ct, "permissions": []})
        by_ct[ct.id]["permissions"].append({
            "id": p.id,
            "codename": f"{ct.app_label}.{p.codename}",
            "action": action,
            "action_label": action_label,
        })

    entries = []
    for item in by_ct.values():
        ct = item["ct"]
        model_cls = ct.model_class()
        label = MODEL_LABELS.get(
            (ct.app_label, ct.model),
            str(model_cls._meta.verbose_name) if model_cls else ct.model,
        )
        item["permissions"].sort(key=lambda x: order.get(x["action"], 9))
        entries.append({
            "app_label": ct.app_label,
            "model": ct.model,
            "model_label": label,
            "permissions": item["permissions"],
        })
    entries.sort(key=lambda e: e["model_label"])
    return Response(entries)
