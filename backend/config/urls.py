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
from oauth2_provider.urls import metadata_urlpatterns

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # Core API (health check, dashboard stats)
    path("api/", include("apps.core.urls")),
    # Authentication
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    # A second, server-rendered login, because the React one yields a JWT and no
    # Django session and the authorize view needs a session. LOGIN_URL points here.
    # TODO: could there be one login instead of two? It would mean the React login
    #       establishing a Django session as well as issuing its JWT, which puts a
    #       `sessionid` cookie back on the browser. SessionAuthentication was taken
    #       out of the DRF chain for that exact reason — stale `sessionid` cookies
    #       broke login with CSRF errors — so reintroducing the cookie without
    #       reintroducing the bug is the whole of the work.
    #
    #       Already decided: the sign-in at consent stays, because consent granted by a session that has
    #       not just authenticated says nothing about who granted it (precogly-mcp
    #       docs/0007); and the styling half is solved, since these pages are built
    #       from the frontend's own design tokens by `npm run build:auth-css`
    #       (docs/0009). So "we can't leverage what we've built" holds for the
    #       session and not for the look.
    #
    #       Unowned, no issue filed.
    path("accounts/", include("allauth.urls")),
    # OAuth 2.1 authorization server, for MCP clients.
    path("o/", include("oauth2_provider.urls", namespace="oauth2_provider")),
    # RFC 8414 and RFC 9728 put the metadata documents at the origin root rather
    # than under the prefix above, and strict clients look nowhere else. Serving
    # them from both mounts is safe: the views reverse their endpoint URLs, so
    # both describe the same "/o/" endpoints.
    path("", include((metadata_urlpatterns, "oauth2_provider_metadata"))),
    # App APIs
    path("api/", include("apps.threat_models.urls")),  # threat-models, reference-images
    path("api/", include("apps.diagrams.urls")),  # diagrams, dfd-templates
    path("api/", include("apps.systems.urls")),  # systems, components, data-flows
    path("api/", include("apps.compliance.urls")),  # frameworks, requirements
    path("api/", include("apps.threats.urls")),  # threat/countermeasure libraries, instances
    path("api/", include("apps.organizations.urls")),  # organizations, memberships
    path("api/", include("apps.packs.urls")),  # library packs, installations
    path("api/", include("apps.ai.urls")),  # per-tenant AI provider configs
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
