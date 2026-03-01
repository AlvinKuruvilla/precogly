"""
URL configuration for Precogly backend.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # Core API (health check, dashboard stats)
    path("api/", include("apps.core.urls")),
    # Authentication
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    # App APIs
    path("api/", include("apps.threat_models.urls")),  # threat-models, reference-images
    path("api/", include("apps.diagrams.urls")),  # diagrams, dfd-templates
    path("api/", include("apps.systems.urls")),  # systems, components, data-flows
    path("api/", include("apps.compliance.urls")),  # frameworks, requirements
    path("api/", include("apps.threats.urls")),  # threat/countermeasure libraries, instances
    path("api/", include("apps.organizations.urls")),  # organizations, memberships
    path("api/", include("apps.packs.urls")),  # library packs, installations
    # API documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# Debug toolbar (development only)
if settings.DEBUG:
    try:
        import debug_toolbar

        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

    # Serve media files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
