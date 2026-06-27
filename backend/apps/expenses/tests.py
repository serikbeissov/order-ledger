"""Тесты расходов: поля выдачи (способ/месяц) и ежемесячные напоминания."""
from datetime import date

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from apps.expenses.models import Expense, ExpenseCategory, RecurringExpense
from apps.expenses.services import recurring_due


class ExpenseFieldsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("root", "r@e.com", "pass12345")
        self.client.force_login(self.admin)
        self.cat = ExpenseCategory.objects.create(name="СММ", is_recurring=True)

    def test_create_with_method_and_period(self):
        r = self.client.post(
            "/api/expenses/",
            {
                "category": self.cat.id,
                "amount": "150000",
                "method": "card",
                "expense_date": "2026-06-27",
                "period": "2026-06-01",
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        e = Expense.objects.get()
        self.assertEqual(e.method, "card")
        self.assertEqual(str(e.period), "2026-06-01")
        self.assertEqual(r.json()["method_display"], "Карта")


class RecurringReminderTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("root", "r@e.com", "pass12345")
        self.client.force_login(self.admin)
        self.rent_cat = ExpenseCategory.objects.create(name="Аренда")
        self.smm_cat = ExpenseCategory.objects.create(name="СММ")
        self.rent = RecurringExpense.objects.create(
            name="Аренда офиса", category=self.rent_cat, planned_amount=300000
        )
        self.smm = RecurringExpense.objects.create(
            name="Зарплата СММ", category=self.smm_cat, planned_amount=150000
        )

    def _expense(self, cat, recurring=None, when="2026-06-10"):
        return Expense.objects.create(
            category=cat, amount=100, expense_date=date.fromisoformat(when),
            period=date(2026, 6, 1), recurring=recurring,
        )

    def test_active_templates_due_when_unpaid(self):
        names = {d["name"] for d in recurring_due("2026-06")}
        self.assertEqual(names, {"Аренда офиса", "Зарплата СММ"})

    def test_paid_by_category_dismisses(self):
        self._expense(self.smm_cat)  # факт СММ без явной ссылки
        names = {d["name"] for d in recurring_due("2026-06")}
        self.assertEqual(names, {"Аренда офиса"})  # СММ погашена по категории

    def test_paid_by_link_dismisses(self):
        self._expense(self.rent_cat, recurring=self.rent)
        names = {d["name"] for d in recurring_due("2026-06")}
        self.assertEqual(names, {"Зарплата СММ"})

    def test_inactive_not_due(self):
        self.rent.is_active = False
        self.rent.save()
        names = {d["name"] for d in recurring_due("2026-06")}
        self.assertEqual(names, {"Зарплата СММ"})

    def test_other_month_does_not_dismiss(self):
        self._expense(self.smm_cat, when="2026-05-10")  # но period=2026-06 → засчитается
        # period перекрывает дату — оплачено за июнь
        names = {d["name"] for d in recurring_due("2026-06")}
        self.assertEqual(names, {"Аренда офиса"})

    def test_endpoint(self):
        r = self.client.get("/api/expenses/recurring_due/?period=2026-06")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()["due"]), 2)
