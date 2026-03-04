"""
URL routing for systems app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ComponentDataAssetViewSet,
    ComponentLibraryViewSet,
    DataAssetViewSet,
    DataFlowViewSet,
    IntegrationSourceViewSet,
    OrgsystemComponentViewSet,
    OrgsystemViewSet,
    TrustBoundaryViewSet,
    TrustZoneViewSet,
)

router = DefaultRouter()
router.register(r"systems", OrgsystemViewSet, basename="orgsystem")
router.register(r"trust-zones", TrustZoneViewSet, basename="trust-zone")
router.register(r"trust-boundaries", TrustBoundaryViewSet, basename="trust-boundary")
router.register(r"component-library", ComponentLibraryViewSet, basename="component-library")
router.register(r"components", OrgsystemComponentViewSet, basename="component")
router.register(r"data-assets", DataAssetViewSet, basename="data-asset")
router.register(r"data-flows", DataFlowViewSet, basename="data-flow")
router.register(r"integrations", IntegrationSourceViewSet, basename="integration")
router.register(r"component-data-assets", ComponentDataAssetViewSet, basename="component-data-asset")

urlpatterns = [
    path("", include(router.urls)),
]
