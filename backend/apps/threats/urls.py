"""
URL routing for threats app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ComponentInstanceCountermeasureViewSet,
    ComponentInstanceThreatViewSet,
    ComponentLibraryThreatViewSet,
    CountermeasureLibraryViewSet,
    DataFlowInstanceThreatViewSet,
    FlowInstanceCountermeasureViewSet,
    PentestFindingViewSet,
    ThreatLibraryViewSet,
    VerificationTestViewSet,
)

router = DefaultRouter()
router.register(r"threat-library", ThreatLibraryViewSet, basename="threat-library")
router.register(
    r"countermeasure-library",
    CountermeasureLibraryViewSet,
    basename="countermeasure-library",
)
router.register(
    r"component-library-threats",
    ComponentLibraryThreatViewSet,
    basename="component-library-threat",
)
router.register(
    r"component-threats",
    ComponentInstanceThreatViewSet,
    basename="component-threat",
)
router.register(
    r"flow-threats",
    DataFlowInstanceThreatViewSet,
    basename="flow-threat",
)
router.register(
    r"component-countermeasures",
    ComponentInstanceCountermeasureViewSet,
    basename="component-countermeasure",
)
router.register(
    r"flow-countermeasures",
    FlowInstanceCountermeasureViewSet,
    basename="flow-countermeasure",
)
router.register(
    r"verification-tests",
    VerificationTestViewSet,
    basename="verification-test",
)
router.register(
    r"pentest-findings",
    PentestFindingViewSet,
    basename="pentest-finding",
)

urlpatterns = [
    path("", include(router.urls)),
]
