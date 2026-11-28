from datetime import timedelta
from urllib.parse import parse_qs, urlencode, urlparse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from oauth2_provider.models import (
    get_access_token_model,
    get_application_model,
    get_grant_model,
    get_refresh_token_model,
)
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
Application = get_application_model()
AccessToken = get_access_token_model()
Grant = get_grant_model()
OAuthRefreshToken = get_refresh_token_model()

REDIRECT = "http://127.0.0.1:33418/callback"
CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSW_bLlY"
PASSWORD = "testpass123"


def jwt_header(user):
    return {"HTTP_AUTHORIZATION": f"Bearer {RefreshToken.for_user(user).access_token}"}


class TestDecidingAnAuthorizationRequest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="consenter", email="consenter@test.org", password=PASSWORD
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
            "scope": "read",
            "state": "opaque-state",
            "code_challenge": CHALLENGE,
            "code_challenge_method": "S256",
            "resource": settings.MCP_RESOURCE_URL,
            **overrides,
        }
        return f"{reverse('authorization-decision')}?{urlencode(params)}"

    def decide(self, url=None, **body):
        return self.client.post(
            url or self.url(),
            body,
            content_type="application/json",
            **jwt_header(self.user),
        )

    def redirect_query(self, response):
        url = response.json()["redirectUrl"]
        assert url.startswith(REDIRECT)
        return parse_qs(urlparse(url).query)

    def test_allowing_with_the_password_issues_a_code_to_the_user(self):
        response = self.decide(allow=True, password=PASSWORD)

        assert response.status_code == 200
        query = self.redirect_query(response)
        assert query["state"] == ["opaque-state"]
        grant = Grant.objects.get(code=query["code"][0])
        assert grant.user == self.user
        assert grant.code_challenge == CHALLENGE
        # oauthlib does not return `resource`, so this checks the view carries it over.
        assert grant.resource == [settings.MCP_RESOURCE_URL]

    def test_denying_sends_access_denied_without_asking_for_the_password(self):
        response = self.decide(allow=False)

        assert response.status_code == 200
        query = self.redirect_query(response)
        assert query["error"] == ["access_denied"]
        assert query["state"] == ["opaque-state"]
        assert not Grant.objects.exists()

    def test_an_edited_request_is_a_404_and_issues_nothing(self):
        # Covers a client that re-registered without this redirect URI after
        # `/o/authorize/` let the request through, as well as an edit in the browser.
        for field, value in [
            ("client_id", "not-a-client"),
            ("redirect_uri", "http://evil.example/callback"),
            ("scope", "admin"),
            ("resource", "http://evil.example/mcp"),
        ]:
            with self.subTest(field=field):
                response = self.decide(
                    self.url(**{field: value}), allow=True, password=PASSWORD
                )

                assert response.status_code == 404
        assert not Grant.objects.exists()

    def test_an_edited_request_is_refused_before_the_password_is_checked(self):
        response = self.decide(
            self.url(client_id="not-a-client"), allow=True, password="wrong"
        )

        assert response.status_code == 404

    def test_a_form_encoded_body_is_refused(self):
        # Django would fill `request.POST` from it, and oauthlib reads `request.POST`
        # as request parameters alongside the query string.
        response = self.client.post(
            self.url(),
            {
                "allow": "true",
                "password": PASSWORD,
                "redirect_uri": "http://evil.example/",
            },
            **jwt_header(self.user),
        )

        assert response.status_code == 415
        assert not Grant.objects.exists()

    def issue_token(self, application):
        """A live access token with its refresh token, as an earlier consent left."""
        access = AccessToken.objects.create(
            user=self.user,
            application=application,
            token=f"access-{application.pk}-{AccessToken.objects.count()}",
            scope="read",
            expires=timezone.now() + timedelta(hours=1),
        )
        refresh = OAuthRefreshToken.objects.create(
            user=self.user,
            application=application,
            token=f"refresh-{access.token}",
            access_token=access,
        )
        return access, refresh

    def test_allowing_replaces_the_clients_earlier_tokens(self):
        # A step-up to `write` consents again. Without the revoke, the earlier `read`
        # pair would stay live beside the new one, unused, until it expired.
        access, refresh = self.issue_token(self.application)
        opencode = Application.objects.create(
            name="opencode",
            client_type=Application.CLIENT_PUBLIC,
            authorization_grant_type=Application.GRANT_AUTHORIZATION_CODE,
            redirect_uris="http://127.0.0.1:53001/callback",
        )
        other_access, _ = self.issue_token(opencode)

        response = self.decide(allow=True, password=PASSWORD)

        assert response.status_code == 200
        assert not AccessToken.objects.filter(pk=access.pk).exists()
        refresh.refresh_from_db()
        assert refresh.revoked is not None
        assert Grant.objects.filter(code=self.redirect_query(response)["code"][0])
        assert AccessToken.objects.filter(pk=other_access.pk).exists()

    def test_allowing_the_same_request_twice_leaves_only_the_second_code(self):
        # Nothing records that a request was decided, so a second allow is accepted.
        # It revokes what the first issued, so the client still holds one grant.
        first = self.redirect_query(self.decide(allow=True, password=PASSWORD))
        second = self.redirect_query(self.decide(allow=True, password=PASSWORD))

        assert not Grant.objects.filter(code=first["code"][0]).exists()
        assert Grant.objects.filter(code=second["code"][0]).exists()

    def test_denying_leaves_the_clients_earlier_tokens(self):
        # Denying a step-up refuses `write`; it does not disconnect the client.
        access, refresh = self.issue_token(self.application)

        self.decide(allow=False)

        assert AccessToken.objects.filter(pk=access.pk).exists()
        refresh.refresh_from_db()
        assert refresh.revoked is None

    def test_allowing_without_a_password_is_refused(self):
        assert self.decide(allow=True).status_code == 400
        assert not Grant.objects.exists()

    def test_a_wrong_password_is_refused_and_the_request_can_be_retried(self):
        assert self.decide(allow=True, password="wrong").status_code == 400
        assert not Grant.objects.exists()

        assert self.decide(allow=True, password=PASSWORD).status_code == 200

    def test_an_mcp_access_token_cannot_decide(self):
        token = AccessToken.objects.create(
            user=self.user,
            application=self.application,
            token="mcp-access-token",
            scope="read",
            expires=timezone.now() + timedelta(hours=1),
        )

        response = self.client.post(
            self.url(),
            {"allow": True, "password": PASSWORD},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token.token}",
        )

        assert response.status_code == 403
        assert not Grant.objects.exists()
