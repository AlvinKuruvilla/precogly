"""
URL routing for compliance app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CountermeasureLibraryStandardViewSet,
    StandardFrameworkViewSet,
    StandardRequirementViewSet,
)

router = DefaultRouter()
router.register(r"frameworks", StandardFrameworkViewSet, basename="framework")
router.register(r"requirements", StandardRequirementViewSet, basename="requirement")
router.register(
    r"countermeasure-standards",
    CountermeasureLibraryStandardViewSet,
    basename="countermeasure-standard",
)

urlpatterns = [
    path("", include(router.urls)),
]
