"""Tests for team membership management access controls (R-01 fix)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.organizations.models import (
    Organization,
    OrganizationMember,
    Team,
    TeamMembership,
)

User = get_user_model()


class TeamMembershipPermissionTests(TestCase):
    """Verify that only team leads and org security_team can manage members."""

    @classmethod
    def setUpTestData(cls):
        cls.org = Organization.objects.create(name="Test Org", domain="test.org")

        cls.lead_user = User.objects.create_user(
            username="lead", email="lead@test.org", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org, user=cls.lead_user, role="member"
        )

        cls.member_user = User.objects.create_user(
            username="member", email="member@test.org", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org, user=cls.member_user, role="member"
        )

        cls.sec_user = User.objects.create_user(
            username="sectm", email="sec@test.org", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org, user=cls.sec_user, role="security_team"
        )

        cls.viewer_user = User.objects.create_user(
            username="viewer", email="viewer@test.org", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org, user=cls.viewer_user, role="member"
        )

        cls.extra_user = User.objects.create_user(
            username="extra", email="extra@test.org", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org, user=cls.extra_user, role="member"
        )

        cls.team = Team.objects.create(
            organization=cls.org, name="Test Team", code="test"
        )
        TeamMembership.objects.create(
            team=cls.team, user=cls.lead_user, role="lead"
        )
        TeamMembership.objects.create(
            team=cls.team, user=cls.member_user, role="member"
        )
        TeamMembership.objects.create(
            team=cls.team, user=cls.viewer_user, role="viewer"
        )

    def setUp(self):
        self.lead_client = APIClient()
        self.lead_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.lead_user).access_token}"
        )
        self.member_client = APIClient()
        self.member_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.member_user).access_token}"
        )
        self.sec_client = APIClient()
        self.sec_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.sec_user).access_token}"
        )

    # --- add-member ---

    def test_member_cannot_add_member(self):
        resp = self.member_client.post(
            f"/api/teams/{self.team.id}/add-member/",
            {"user_id": self.extra_user.id},
        )
        self.assertEqual(resp.status_code, 403)

    def test_lead_can_add_member(self):
        resp = self.lead_client.post(
            f"/api/teams/{self.team.id}/add-member/",
            {"user_id": self.extra_user.id},
        )
        self.assertIn(resp.status_code, [200, 201])

    def test_security_team_can_add_member(self):
        resp = self.sec_client.post(
            f"/api/teams/{self.team.id}/add-member/",
            {"user_id": self.extra_user.id},
        )
        self.assertIn(resp.status_code, [200, 201])

    # --- invite-member ---

    def test_member_cannot_invite(self):
        resp = self.member_client.post(
            f"/api/teams/{self.team.id}/invite-member/",
            {"email": "new@example.com"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_lead_can_invite(self):
        resp = self.lead_client.post(
            f"/api/teams/{self.team.id}/invite-member/",
            {"email": "invited@example.com"},
        )
        self.assertIn(resp.status_code, [200, 201])

    # --- change-member-role ---

    def test_member_cannot_change_role(self):
        resp = self.member_client.post(
            f"/api/teams/{self.team.id}/change-member-role/",
            {"user_id": self.viewer_user.id, "role": "lead"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_member_cannot_self_escalate(self):
        """R-01 core bug: a plain member must not promote themselves to lead."""
        resp = self.member_client.post(
            f"/api/teams/{self.team.id}/change-member-role/",
            {"user_id": self.member_user.id, "role": "lead"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_lead_can_change_role(self):
        resp = self.lead_client.post(
            f"/api/teams/{self.team.id}/change-member-role/",
            {"user_id": self.viewer_user.id, "role": "member"},
        )
        self.assertEqual(resp.status_code, 200)

    def test_invalid_role_rejected(self):
        resp = self.lead_client.post(
            f"/api/teams/{self.team.id}/change-member-role/",
            {"user_id": self.member_user.id, "role": "superadmin"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid role", resp.json().get("error", ""))

    # --- remove-member ---

    def test_member_cannot_remove_member(self):
        resp = self.member_client.post(
            f"/api/teams/{self.team.id}/remove-member/",
            {"user_id": self.viewer_user.id},
        )
        self.assertEqual(resp.status_code, 403)

    def test_lead_can_remove_member(self):
        resp = self.lead_client.post(
            f"/api/teams/{self.team.id}/remove-member/",
            {"user_id": self.viewer_user.id},
        )
        self.assertEqual(resp.status_code, 204)

    # --- last-lead guard ---

    def test_cannot_demote_last_lead(self):
        resp = self.lead_client.post(
            f"/api/teams/{self.team.id}/change-member-role/",
            {"user_id": self.lead_user.id, "role": "member"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("only team lead", resp.json().get("error", ""))

    def test_cannot_remove_last_lead(self):
        resp = self.lead_client.post(
            f"/api/teams/{self.team.id}/remove-member/",
            {"user_id": self.lead_user.id},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("only team lead", resp.json().get("error", ""))

    def test_can_demote_lead_when_another_exists(self):
        """If there are two leads, demoting one is fine."""
        TeamMembership.objects.create(
            team=self.team, user=self.sec_user, role="lead"
        )
        resp = self.sec_client.post(
            f"/api/teams/{self.team.id}/change-member-role/",
            {"user_id": self.lead_user.id, "role": "member"},
        )
        self.assertEqual(resp.status_code, 200)
