"""
URL routing for core app.
"""

from django.urls import path

from .views import DashboardStatsView, HealthCheckView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
]
