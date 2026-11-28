from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from oauth2_provider.models import get_access_token_model, get_application_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.mcp.api import dispatch

User = get_user_model()
Application = get_application_model()
AccessToken = get_access_token_model()

REDIRECT = "http://127.0.0.1:33418/callback"
CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSW_bLlY"
SCOPES = settings.OAUTH2_PROVIDER["SCOPES"]


def jwt_header(user):
    return {"HTTP_AUTHORIZATION": f"Bearer {RefreshToken.for_user(user).access_token}"}


class TestReadingAnAuthorizationRequest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="consenter", email="consenter@test.org", password="testpass123"
        )
        cls.application = Application.objects.create(
            name="Claude Code",
            client_type=Application.CLIENT_PUBLIC,
            authorization_grant_type=Application.GRANT_AUTHORIZATION_CODE,
            redirect_uris=REDIRECT,
        )

    def url(self, **overrides):
        params = {
            "response_type": "code",
            "client_id": self.application.client_id,
            "redirect_uri": REDIRECT,
            "scope": "read write",
            "state": "opaque-state",
            "code_challenge": CHALLENGE,
            "code_challenge_method": "S256",
            "resource": settings.MCP_RESOURCE_URL,
            **overrides,
        }
        return f"{reverse('authorization-request')}?{urlencode(params)}"

    def test_a_valid_request_returns_what_the_consent_page_shows(self):
        response = self.client.get(self.url(), **jwt_header(self.user))

        assert response.status_code == 200
        assert response.json() == {
            "clientName": "Claude Code",
            "scopes": [
                {"name": "read", "description": SCOPES["read"]},
                {"name": "write", "description": SCOPES["write"]},
            ],
            "redirectUri": REDIRECT,
            "loopbackRedirect": True,
        }

    def test_an_edited_request_is_a_404(self):
        # The query comes back through the browser, so each field `/o/authorize/`
        # checked is checked again here.
        for field, value in [
            ("client_id", "not-a-client"),
            ("redirect_uri", "http://evil.example/callback"),
            ("scope", "admin"),
            ("resource", "http://evil.example/mcp"),
        ]:
            with self.subTest(field=field):
                url = self.url(**{field: value})

                assert self.client.get(url, **jwt_header(self.user)).status_code == 404

    def test_an_mcp_access_token_is_refused(self):
        token = AccessToken.objects.create(
            user=self.user,
            application=self.application,
            token="mcp-access-token",
            scope="read",
            expires=timezone.now() + timedelta(hours=1),
        )

        response = self.client.get(
            self.url(), HTTP_AUTHORIZATION=f"Bearer {token.token}"
        )

        assert response.status_code == 403

    def test_code_mode_is_refused(self):
        # `dispatch` forces authentication past the view's own classes, so this is the
        # path a JWT-only `authentication_classes` would not have stopped.
        status, _, _ = dispatch(self.user, "GET", self.url())

        assert status == 403
