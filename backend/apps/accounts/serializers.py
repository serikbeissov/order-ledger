from django.contrib.auth.models import Group, Permission, User
from rest_framework import serializers

from .roles import ROLE_GROUPS, user_role


class GroupRefSerializer(serializers.ModelSerializer):
    """Краткое представление роли (группы) для вложения в пользователя."""

    class Meta:
        model = Group
        fields = ["id", "name"]


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    groups = GroupRefSerializer(many=True, read_only=True)
    permissions = serializers.SerializerMethodField()
    # id-ы для предзаполнения формы редактирования
    group_id_list = serializers.SerializerMethodField()
    own_permission_ids = serializers.SerializerMethodField()

    # запись
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    group_ids = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), many=True, write_only=True, required=False
    )
    user_permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(), many=True, write_only=True, required=False
    )
    # удобный ярлык для быстрого назначения базовой роли (опц.)
    role_code = serializers.ChoiceField(
        choices=list(ROLE_GROUPS.keys()), write_only=True, required=False
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "is_active", "is_superuser", "role", "groups", "permissions",
            "group_id_list", "own_permission_ids",
            "password", "group_ids", "user_permission_ids", "role_code",
        ]
        read_only_fields = ["is_superuser"]

    def get_role(self, obj):
        return user_role(obj)

    def get_permissions(self, obj):
        """Эффективные права (роль + индивидуальные), формат 'app.codename'."""
        return sorted(obj.get_all_permissions())

    def get_group_id_list(self, obj):
        return list(obj.groups.values_list("id", flat=True))

    def get_own_permission_ids(self, obj):
        """Личные права пользователя (без унаследованных от ролей)."""
        return list(obj.user_permissions.values_list("id", flat=True))

    def _apply_relations(self, user, validated):
        role_code = validated.pop("role_code", None)
        group_ids = validated.pop("group_ids", None)
        user_permission_ids = validated.pop("user_permission_ids", None)

        if group_ids is not None:
            user.groups.set(group_ids)
        elif role_code:
            title = ROLE_GROUPS[role_code]
            group, _ = Group.objects.get_or_create(name=title)
            user.groups.set([group])

        if user_permission_ids is not None:
            user.user_permissions.set(user_permission_ids)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        # реляции применяем после save()
        relations = {
            k: validated_data.pop(k)
            for k in ("role_code", "group_ids", "user_permission_ids")
            if k in validated_data
        }
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        self._apply_relations(user, relations)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        relations = {
            k: validated_data.pop(k)
            for k in ("role_code", "group_ids", "user_permission_ids")
            if k in validated_data
        }
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        self._apply_relations(instance, relations)
        return instance


class GroupSerializer(serializers.ModelSerializer):
    """Роль = группа Django с набором прав (CLAUDE.md §3.3)."""

    permissions = serializers.SerializerMethodField()
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source="permissions",
    )
    current_permission_ids = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            "id", "name", "permissions", "permission_ids",
            "current_permission_ids", "user_count",
        ]

    def get_permissions(self, obj):
        return [
            f"{p.content_type.app_label}.{p.codename}"
            for p in obj.permissions.select_related("content_type").all()
        ]

    def get_current_permission_ids(self, obj):
        return list(obj.permissions.values_list("id", flat=True))

    def get_user_count(self, obj):
        return obj.user_set.count()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
