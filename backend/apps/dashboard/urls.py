from django.urls import path

from .views import backup_excel, dashboard

urlpatterns = [
    path("dashboard/", dashboard, name="dashboard"),
    path("backup/excel/", backup_excel, name="backup-excel"),
]
