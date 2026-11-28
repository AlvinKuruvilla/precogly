from urllib.parse import urlencode, urlsplit

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.views.generic import View
from drf_spectacular.utils import extend_schema
from oauth2_provider.exceptions import OAuthToolkitError
from oauth2_provider.http import OAuth2ResponseRedirect
from oauth2_provider.models import (
    get_access_token_model,
    get_application_model,
    get_grant_model,
    get_refresh_token_model,
    refresh_token_expire_timedelta,
)
from oauth2_provider.scopes import get_scopes_backend
from oauth2_provider.settings import oauth2_settings
from oauth2_provider.views.mixins import OAuthLibMixin
from oauthlib.oauth2.rfc6749.errors import CustomOAuth2Error
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.oauth.permissions import SignedInInBrowser
from apps.oauth.serializers import (
    AuthorizationRequestSerializer,
    AuthorizedApplicationSerializer,
    DecisionResultSerializer,
    DecisionSerializer,
)

LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost"}


class AuthorizationRequestMixin(OAuthLibMixin):
    """Validates the authorization request in a request's query string.

    Nothing is stored between requests, so every view that acts on the query string
    validates it again: the browser may have edited it since `/o/authorize/` checked it.
    """

    def validate_query(self, request):
        """Returns the request's scopes as a list and the credentials
        `create_authorization_response` takes. Raises `OAuthToolkitError`.

        `request` is the Django request: a DRF view passes `request._request`.
        """
        scopes, credentials = self.validate_authorization_request(request)

        # Every token must name the MCP endpoint, and nothing else, as its resource.
        # django-oauth-toolkit checks a token's audience only when it has one, and by
        # URL prefix, so a token with no resource, or with the origin among its
        # resources, works on every `/api/` endpoint, where `read` and `write` are not
        # checked. Compared exactly, as the MCP token verifier compares it.
        resource = request.GET.getlist("resource")
        if set(resource) != {settings.MCP_RESOURCE_URL}:
            raise OAuthToolkitError(
                error=CustomOAuth2Error(
                    error="invalid_target",
                    description=(
                        f"Tokens here are issued only for the MCP endpoint: send "
                        f"resource={settings.MCP_RESOURCE_URL} and no other resource."
                    ),
                    state=credentials.get("state"),
                ),
                redirect_uri=credentials["redirect_uri"],
            )

        # `request` is oauthlib's request object, which the grant does not need:
        # django-oauth-toolkit's own `form_valid` builds the credentials without it.
        del credentials["request"]
        # oauthlib does not validate `resource`, so it does not return it. Set here,
        # because the toolkit saves the grant's resource from this key.
        credentials["resource"] = resource
        return scopes, credentials


class AuthorizeView(AuthorizationRequestMixin, View):
    """Validates an authorization request and sends the browser to the consent page
    with the same query string.

    django-oauth-toolkit's `AuthorizationView` requires a Django session at this point;
    this view requires none, because the user signs in on the consent page instead.
    It drops the toolkit's `skip_authorization`, `approval_prompt=auto` and
    `prompt=login`, which all need a signed-in user here. Dynamic registration never
    sets `skip_authorization`, and `REQUEST_APPROVAL_PROMPT` is left at `force`.
    """

    def get(self, request, *args, **kwargs):
        try:
            self.validate_query(request)
        except OAuthToolkitError as error:
            return self.error_response(error)

        return HttpResponseRedirect(
            f"{settings.FRONTEND_URL}/oauth/consent?{request.META['QUERY_STRING']}"
        )

    def error_response(self, error):
        redirect, response = super().error_response(error)
        if not redirect:
            return HttpResponseRedirect(error_page_url(response["error"]))
        # `Application.get_allowed_schemes()` returns this setting unless a custom
        # application model overrides it. Precogly uses the toolkit's own application
        # model, so the setting applies.
        return OAuth2ResponseRedirect(
            response["url"], oauth2_settings.ALLOWED_REDIRECT_URI_SCHEMES
        )


def error_page_url(oauthlib_error):
    """Return the URL of the SPA's error page for an error that cannot go back to the
    client.

    Used when there is no trusted redirect URI: an unknown client, or a redirect URI it
    never registered. `error_description` comes from the query string, which a crafted
    link controls, so the SPA must render it as plain text, never as HTML.
    """
    query = urlencode(
        {
            "error": oauthlib_error.error,
            "error_description": oauthlib_error.description or "",
        }
    )
    return f"{settings.FRONTEND_URL}/oauth/error?{query}"


class AuthorizationRequestView(AuthorizationRequestMixin, APIView):
    """Returns what the consent page shows for the authorization request in the query
    string. An invalid request is a 404.
    """

    permission_classes = [IsAuthenticated, SignedInInBrowser]

    @extend_schema(responses=AuthorizationRequestSerializer)
    def get(self, request):
        try:
            scopes, credentials = self.validate_query(request._request)
        except OAuthToolkitError:
            raise NotFound from None

        application = get_application_model().objects.get(
            client_id=credentials["client_id"]
        )
        descriptions = get_scopes_backend().get_all_scopes()
        redirect_uri = credentials["redirect_uri"]
        return Response(
            AuthorizationRequestSerializer(
                {
                    "client_name": application.name,
                    "scopes": [
                        {"name": scope, "description": descriptions[scope]}
                        for scope in scopes
                    ],
                    "redirect_uri": redirect_uri,
                    "loopback_redirect": urlsplit(redirect_uri).hostname
                    in LOOPBACK_HOSTS,
                }
            ).data
        )


class DecisionView(AuthorizationRequestMixin, APIView):
    """Allows or denies the authorization request in the query string, and returns
    where the browser goes next.

        query    decision  password  response
        -------  --------  --------  ------------------
        invalid  any       any       404
        valid    deny      ignored   200, access_denied
        valid    allow     correct   200, code
        valid    allow     wrong     400

    TODO(AlvinKuruvilla): wrong passwords are not limited here. One limit per user,
        shared with the JWT login (`/api/auth/login/`, which has none either), is the
        split-out password rate-limiting PR. The design is in SESSION.md, "Per-user
        password rate limit".
    """

    permission_classes = [IsAuthenticated, SignedInInBrowser]
    # A form-encoded body fills Django's `request.POST`, which oauthlib reads as
    # request parameters alongside the query string.
    parser_classes = [JSONParser]

    @extend_schema(request=DecisionSerializer, responses=DecisionResultSerializer)
    def post(self, request):
        decision = DecisionSerializer(data=request.data)
        decision.is_valid(raise_exception=True)
        allow = decision.validated_data["allow"]

        try:
            scopes, credentials = self.validate_query(request._request)
        except OAuthToolkitError:
            raise NotFound from None

        if allow and not request.user.check_password(
            decision.validated_data["password"]
        ):
            raise ValidationError({"password": "That password is incorrect."})

        # The user approved this client, so revoke its earlier tokens and grants:
        # the code issued below becomes its only access. Must stay above
        # `create_authorization_response`, or it deletes the grant issued there.
        if allow:
            application = get_application_model().objects.get(
                client_id=credentials["client_id"]
            )
            revoke_access(request.user, application.pk)

        try:
            # The view mixin's method, which takes the scopes as one space-separated
            # string, as django-oauth-toolkit stores a grant's scopes.
            uri, _, _, _ = self.create_authorization_response(
                request._request,
                scopes=" ".join(scopes),
                credentials=credentials,
                allow=allow,
            )
        except OAuthToolkitError as error:
            # Denying lands here too: django-oauth-toolkit raises `access_denied`
            # carrying the client's redirect URI and state. With no trusted redirect
            # URI, `url` is a bare `?error=…` that would send the browser back to the
            # consent page, so the SPA's error page shows it instead.
            redirect, response = self.error_response(error)
            uri = response["url"] if redirect else error_page_url(response["error"])
        return Response(DecisionResultSerializer({"redirect_url": uri}).data)


def live_access_tokens(user):
    """The user's access tokens that still grant access, now or after a refresh.

    A client is authorized while it holds one of these: an unexpired access token, or
    an expired one whose refresh token is unrevoked and not yet idle-expired.
    """
    now = timezone.now()
    # `refresh_token__isnull=False` keeps out tokens issued without a refresh token,
    # whose missing join would otherwise read as "not revoked".
    refreshable = Q(refresh_token__isnull=False, refresh_token__revoked__isnull=True)
    # The cutoff django-oauth-toolkit applies when the refresh token is presented: it
    # is dead once the access token's `expires` plus REFRESH_TOKEN_EXPIRE_SECONDS has
    # passed. Without it, a client unused for a week stays listed but cannot refresh.
    expire_delta = refresh_token_expire_timedelta()
    if expire_delta:
        refreshable &= Q(expires__gt=now - expire_delta)
    return (
        get_access_token_model()
        .objects.filter(user=user)
        .filter(Q(expires__gt=now) | refreshable)
    )


def revoke_access(user, application_id):
    """Revoke every token and grant `user` holds for an application."""
    # Refresh tokens first: `revoke` marks each one revoked and deletes the access
    # token it last issued. Deleting the remaining access tokens and grants then
    # leaves the client nothing to use or exchange.
    with transaction.atomic():
        for refresh_token in get_refresh_token_model().objects.filter(
            user=user, application_id=application_id, revoked__isnull=True
        ):
            refresh_token.revoke()
        get_access_token_model().objects.filter(
            user=user, application_id=application_id
        ).delete()
        get_grant_model().objects.filter(
            user=user, application_id=application_id
        ).delete()


class AuthorizedApplicationsView(APIView):
    """Lists the MCP clients that can currently act on the user's account."""

    permission_classes = [IsAuthenticated, SignedInInBrowser]

    @extend_schema(responses=AuthorizedApplicationSerializer(many=True))
    def get(self, request):
        descriptions = get_scopes_backend().get_all_scopes()
        by_application = {}
        for token in live_access_tokens(request.user).select_related("application"):
            application = token.application
            if application.pk not in by_application:
                # `redirect_uris` is space-separated. As of 2026-11-14, Claude Code and
                # opencode each register a single URI, so the host of the first entry
                # is where the client runs.
                redirect_host = (
                    urlsplit(application.redirect_uris.split()[0]).hostname
                    if application.redirect_uris
                    else ""
                ) or ""
                by_application[application.pk] = {
                    "id": application.pk,
                    "name": application.name,
                    "scopes": set(),
                    "registered_at": application.created,
                    "runs_locally": redirect_host in LOOPBACK_HOSTS,
                    "redirect_host": redirect_host,
                }
            by_application[application.pk]["scopes"].update(token.scope.split())

        applications = sorted(
            by_application.values(),
            key=lambda entry: entry["registered_at"],
            reverse=True,
        )
        for entry in applications:
            entry["scopes"] = [
                {"name": scope, "description": descriptions.get(scope, scope)}
                for scope in sorted(entry["scopes"])
            ]
        return Response(AuthorizedApplicationSerializer(applications, many=True).data)


class AuthorizedApplicationView(APIView):
    """Revokes one MCP client's access to the user's account."""

    permission_classes = [IsAuthenticated, SignedInInBrowser]

    @extend_schema(responses={204: None})
    def delete(self, request, application_id):
        if (
            not live_access_tokens(request.user)
            .filter(application_id=application_id)
            .exists()
        ):
            raise NotFound

        revoke_access(request.user, application_id)
        return Response(status=204)
