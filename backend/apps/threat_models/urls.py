"""
URL routing for threat_models app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ThreatModelReferenceImageViewSet, ThreatModelViewSet

router = DefaultRouter()
router.register(r"threat-models", ThreatModelViewSet, basename="threat-model")

# Nested route for threat model reference images
router.register(
    r"threat-models/(?P<threat_model_pk>\d+)/reference-images",
    ThreatModelReferenceImageViewSet,
    basename="threat-model-reference-images",
)

# Direct route for individual image operations
router.register(
    r"reference-images",
    ThreatModelReferenceImageViewSet,
    basename="reference-images",
)

urlpatterns = [
    path("", include(router.urls)),
]
