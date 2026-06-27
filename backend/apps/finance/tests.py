"""Тесты валидаций инвестиций и резервов + запрет удаления."""
from datetime import date

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from apps.finance.models import Investor, Investment, Reserve, ReserveMovement


class FinanceGuardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("root", "r@e.com", "pass12345")
        self.client.force_login(self.admin)
        self.inv = Investor.objects.create(name="И")

    def test_investment_return_cannot_exceed_pool(self):
        Investment.objects.create(investor=self.inv, direction="in",
            amount=100000, moved_at=date.today())
        r = self.client.post("/api/investments/", {
            "investor": self.inv.id, "direction": "return", "amount": "150000",
            "method": "cash", "moved_at": "2026-06-10"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_investment_delete_forbidden(self):
        i = Investment.objects.create(investor=self.inv, direction="in",
            amount=100000, moved_at=date.today())
        r = self.client.delete(f"/api/investments/{i.id}/")
        self.assertEqual(r.status_code, 405)

    def test_reserve_release_cannot_exceed_balance(self):
        res = Reserve.objects.create(name="Налоги", kind="tax")
        ReserveMovement.objects.create(reserve=res, direction="set_aside",
            amount=50000, moved_at=date.today())
        r = self.client.post(f"/api/reserves/{res.id}/movements/", {
            "direction": "release", "amount": "80000", "moved_at": "2026-06-10"},
            format="json")
        self.assertEqual(r.status_code, 400)
