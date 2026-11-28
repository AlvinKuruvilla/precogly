from django.urls import path

from apps.oauth.views import (
    AuthorizationRequestView,
    AuthorizedApplicationsView,
    AuthorizedApplicationView,
    DecisionView,
)

urlpatterns = [
    path(
        "authorized-apps/",
        AuthorizedApplicationsView.as_view(),
        name="authorized-applications",
    ),
    path(
        "authorized-apps/<int:application_id>/",
        AuthorizedApplicationView.as_view(),
        name="authorized-application",
    ),
    path(
        "authorization-request/",
        AuthorizationRequestView.as_view(),
        name="authorization-request",
    ),
    path(
        "decision/",
        DecisionView.as_view(),
        name="authorization-decision",
    ),
]
