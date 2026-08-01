"""Tests for org-scoped IsSecurityTeam permission (R-02 fix)."""

from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory

from apps.core.permissions import IsSecurityTeam
from apps.organizations.models import (
    BusinessUnit,
    Organization,
    OrganizationMember,
)

User = get_user_model()


class IsSecurityTeamObjectPermissionTests(TestCase):
    """Verify IsSecurityTeam enforces org-scoped role checks at object level."""

    @classmethod
    def setUpTestData(cls):
        cls.factory = RequestFactory()
        cls.permission = IsSecurityTeam()

        cls.org_a = Organization.objects.create(name="Org A", domain="org-a.test")
        cls.org_b = Organization.objects.create(name="Org B", domain="org-b.test")

        cls.user_sec_a = User.objects.create_user(
            username="sec_a", email="sec_a@example.com", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org_a, user=cls.user_sec_a, role="security_team"
        )
        OrganizationMember.objects.create(
            organization=cls.org_b, user=cls.user_sec_a, role="member"
        )

        cls.user_sec_b = User.objects.create_user(
            username="sec_b", email="sec_b@example.com", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org_b, user=cls.user_sec_b, role="security_team"
        )

        cls.user_member = User.objects.create_user(
            username="member", email="member@example.com", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org_a, user=cls.user_member, role="member"
        )

        cls.bu_a = BusinessUnit.objects.create(
            organization=cls.org_a, name="BU in Org A", code="bu-a"
        )
        cls.bu_b = BusinessUnit.objects.create(
            organization=cls.org_b, name="BU in Org B", code="bu-b"
        )

    def _make_patch_request(self, user):
        request = self.factory.patch("/fake/")
        request.user = user
        return request

    def _make_get_request(self, user):
        request = self.factory.get("/fake/")
        request.user = user
        return request

    def test_has_permission_allows_security_team_in_any_org(self):
        request = self._make_patch_request(self.user_sec_a)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_has_permission_allows_member_with_personal_workspace(self):
        """Users get a personal workspace with security_team role via signal,
        so has_permission passes — org scoping happens at object level."""
        request = self._make_patch_request(self.user_member)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_has_permission_allows_safe_methods(self):
        request = self._make_get_request(self.user_member)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_object_permission_allows_security_team_in_same_org(self):
        request = self._make_patch_request(self.user_sec_a)
        self.assertTrue(
            self.permission.has_object_permission(request, None, self.bu_a)
        )

    def test_object_permission_denies_security_team_in_different_org(self):
        """R-02: security_team in Org A must NOT write to Org B objects."""
        request = self._make_patch_request(self.user_sec_a)
        self.assertFalse(
            self.permission.has_object_permission(request, None, self.bu_b)
        )

    def test_object_permission_allows_security_team_in_target_org(self):
        request = self._make_patch_request(self.user_sec_b)
        self.assertTrue(
            self.permission.has_object_permission(request, None, self.bu_b)
        )

    def test_object_permission_allows_safe_methods_for_anyone(self):
        request = self._make_get_request(self.user_member)
        self.assertTrue(
            self.permission.has_object_permission(request, None, self.bu_b)
        )

    def test_object_permission_denies_plain_member_write(self):
        request = self._make_patch_request(self.user_member)
        self.assertFalse(
            self.permission.has_object_permission(request, None, self.bu_a)
        )

    def test_cross_org_member_management_blocked(self):
        """security_team in Org A cannot modify Org B's member records."""
        member_b = OrganizationMember.objects.filter(
            organization=self.org_b, user=self.user_sec_b
        ).first()
        request = self._make_patch_request(self.user_sec_a)
        self.assertFalse(
            self.permission.has_object_permission(request, None, member_b)
        )
