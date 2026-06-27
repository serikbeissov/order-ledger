from django.contrib.auth.models import Group, User
from rest_framework import serializers

from .roles import ROLE_GROUPS, user_role


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # роль на запись: код admin|manager|staff
    role_code = serializers.ChoiceField(
        choices=list(ROLE_GROUPS.keys()), write_only=True, required=False
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "is_active", "is_superuser", "role", "password", "role_code",
        ]

    def get_role(self, obj):
        return user_role(obj)

    def _apply_role(self, user, role_code):
        if not role_code:
            return
        title = ROLE_GROUPS[role_code]
        group, _ = Group.objects.get_or_create(name=title)
        # одна роль на пользователя: чистим прочие ролевые группы
        user.groups.remove(*[
            g for g in user.groups.all() if g.name in ROLE_GROUPS.values()
        ])
        user.groups.add(group)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        role_code = validated_data.pop("role_code", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        self._apply_role(user, role_code)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        role_code = validated_data.pop("role_code", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        self._apply_role(instance, role_code)
        return instance


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
