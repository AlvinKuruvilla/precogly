"""
URL routing for diagrams app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DFDTemplatesLibraryViewSet, DFDViewSet, ThreatModelViewSet

router = DefaultRouter()
router.register(r"threat-models", ThreatModelViewSet, basename="threat-model")
router.register(r"diagrams", DFDViewSet, basename="dfd")
router.register(r"dfd-templates", DFDTemplatesLibraryViewSet, basename="dfd-template")

urlpatterns = [
    path("", include(router.urls)),
]
