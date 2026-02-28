"""
URL routing for threats app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ComponentInstanceCountermeasureStandardViewSet,
    ComponentInstanceCountermeasureViewSet,
    ComponentInstanceThreatViewSet,
    ComponentLibraryThreatViewSet,
    CountermeasureLibraryViewSet,
    DataFlowInstanceThreatViewSet,
    ExternalTaxonomyViewSet,
    FlowInstanceCountermeasureStandardViewSet,
    FlowInstanceCountermeasureViewSet,
    PentestFindingViewSet,
    TaxonomyEntryViewSet,
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
router.register(
    r"instance-countermeasure-standards",
    ComponentInstanceCountermeasureStandardViewSet,
    basename="instance-countermeasure-standard",
)
router.register(
    r"flow-instance-countermeasure-standards",
    FlowInstanceCountermeasureStandardViewSet,
    basename="flow-instance-countermeasure-standard",
)

router.register(r"taxonomies", ExternalTaxonomyViewSet, basename="taxonomy")
router.register(r"taxonomy-entries", TaxonomyEntryViewSet, basename="taxonomy-entry")

urlpatterns = [
    path("", include(router.urls)),
]
