"""Tests for threat library N+1 query fix."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.organizations.models import Organization, OrganizationMember
from apps.threats.models import (
    ExternalTaxonomy,
    TaxonomyEntry,
    ThreatLibrary,
    ThreatLibraryTaxonomyEntry,
)

User = get_user_model()


class ThreatLibraryN1QueryTests(TestCase):
    """Verify that taxonomy prefetch eliminates N+1 queries."""

    @classmethod
    def setUpTestData(cls):
        cls.org = Organization.objects.create(name="Test Org", domain="test.org")
        cls.user = User.objects.create_user(
            username="n1user", email="n1@test.org", password="testpass123"
        )
        OrganizationMember.objects.create(
            organization=cls.org, user=cls.user, role="security_team"
        )

        taxonomy = ExternalTaxonomy.objects.create(
            name="Test Taxonomy", slug="test-tax"
        )
        for i in range(10):
            threat = ThreatLibrary.objects.create(
                name=f"Threat {i}", description=f"Description {i}"
            )
            entry = TaxonomyEntry.objects.create(
                taxonomy=taxonomy,
                external_id=f"T-{i:04d}",
                title=f"Entry {i}",
            )
            ThreatLibraryTaxonomyEntry.objects.create(
                threat_library=threat, taxonomy_entry=entry
            )

    def setUp(self):
        self.client = APIClient()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}"
        )

    def test_list_threats_with_taxonomy_uses_constant_queries(self):
        """With prefetch, query count should not scale with threat count."""
        with CaptureQueriesContext(connection) as ctx:
            resp = self.client.get("/api/threat-library/")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.data), 10)
        self.assertLessEqual(len(ctx), 10,
            f"Expected <=10 queries but got {len(ctx)} — N+1 likely not fixed")
