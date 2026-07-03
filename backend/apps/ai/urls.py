"""URL routing for the AI app's settings API."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AIProviderConfigViewSet, AIUsageSummaryView

router = DefaultRouter()
router.register(r"ai-providers", AIProviderConfigViewSet, basename="ai-provider")

urlpatterns = [
    path("ai-usage/summary/", AIUsageSummaryView.as_view(), name="ai-usage-summary"),
    path("", include(router.urls)),
]
