"""Tests for AI usage metering and the usage-summary endpoint.

Two layers:

* :class:`MeteringProviderTests` — the wrapper that turns each completion into an
  ``AIUsageRecord``: it records token counts and snapshot fields, honours the
  adapter's price (``None`` for self-hosted), and writes nothing when the server
  reported no usage.
* :class:`AIUsageSummaryAPITests` — the aggregate read path: totals/breakdowns
  reconcile, other orgs don't leak, and the org/window params are validated.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from django.test import TestCase

from apps.ai.models import AIProviderConfig, AIUsageRecord
from apps.ai.providers.base import (
    ChatProvider,
    Completion,
    ProviderHealth,
    ResolvedConfig,
    TokenUsage,
)
from apps.ai.resolver import MeteringProvider
from apps.organizations.models import Organization, OrganizationMember

User = get_user_model()


class _FakeProvider(ChatProvider):
    """A provider that returns a canned completion and a fixed price."""

    def __init__(self, config, completion, *, price=None):
        super().__init__(config)
        self._completion = completion
        self._price = price

    def complete(self, messages, *, temperature=0.2, force_json=True):
        return self._completion

    def test_connection(self):
        return ProviderHealth(ok=True, detail="ok")

    def price_for(self, usage):
        return self._price


class MeteringProviderTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org = Organization.objects.create(name="Acme")
        cls.user = User.objects.create_user(
            username="u", email="u@acme.test", password="pw"
        )
        # A real config so the SET_NULL FK can hold its id.
        cls.config = AIProviderConfig.objects.create(
            organization=cls.org, name="cfg", base_url="http://x/v1", model="local-model"
        )

    def _resolved(self, config_id):
        return ResolvedConfig(
            provider_type="openai_compat",
            base_url="http://x/v1",
            model="local-model",
            config_id=config_id,
        )

    def test_records_usage_and_snapshot_fields(self):
        inner = _FakeProvider(
            self._resolved(self.config.id), Completion("ok", TokenUsage(10, 4, 14))
        )
        provider = MeteringProvider(
            inner, organization=self.org, feature="suggest_threats", user=self.user
        )

        result = provider.complete([{"role": "user", "content": "hi"}])

        self.assertEqual(result.content, "ok")
        record = AIUsageRecord.objects.get()
        self.assertEqual(record.organization, self.org)
        self.assertEqual(record.provider_config_id, self.config.id)
        self.assertEqual(record.feature, "suggest_threats")
        self.assertEqual(record.model, "local-model")
        self.assertEqual(record.provider_type, "openai_compat")
        self.assertEqual(record.user, self.user)
        self.assertEqual(
            (record.prompt_tokens, record.completion_tokens, record.total_tokens),
            (10, 4, 14),
        )
        # Self-hosted: the fake provider priced it None.
        self.assertIsNone(record.cost_usd)

    def test_no_usage_writes_no_record(self):
        inner = _FakeProvider(self._resolved(self.config.id), Completion("ok", None))
        MeteringProvider(
            inner, organization=self.org, feature="suggest_threats"
        ).complete([])
        self.assertEqual(AIUsageRecord.objects.count(), 0)

    def test_priced_provider_records_cost(self):
        inner = _FakeProvider(
            self._resolved(None),
            Completion("ok", TokenUsage(1000, 500, 1500)),
            price=Decimal("0.0072"),
        )
        MeteringProvider(
            inner, organization=self.org, feature="suggest_threats"
        ).complete([])

        record = AIUsageRecord.objects.get()
        self.assertEqual(record.cost_usd, Decimal("0.0072"))
        # No saved config (settings fallback) → null link, history still intact.
        self.assertIsNone(record.provider_config_id)


class AIUsageSummaryAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org = Organization.objects.create(name="Acme")
        cls.other_org = Organization.objects.create(name="Globex")
        cls.member = User.objects.create_user(
            username="member", email="member@acme.test", password="pw"
        )
        OrganizationMember.objects.create(organization=cls.org, user=cls.member)

        # Two records for the member's org: one self-hosted (no cost), one managed.
        AIUsageRecord.objects.create(
            organization=cls.org,
            feature="suggest_threats",
            model="local-model",
            provider_type="openai_compat",
            user=cls.member,
            prompt_tokens=100,
            completion_tokens=20,
            total_tokens=120,
            cost_usd=None,
        )
        AIUsageRecord.objects.create(
            organization=cls.org,
            feature="suggest_threats",
            model="claude-sonnet-4-6",
            provider_type="anthropic",
            user=cls.member,
            prompt_tokens=200,
            completion_tokens=50,
            total_tokens=250,
            cost_usd=Decimal("0.01"),
        )
        # Another org's record must never leak into the member's totals.
        AIUsageRecord.objects.create(
            organization=cls.other_org,
            feature="suggest_threats",
            model="x",
            provider_type="openai_compat",
            prompt_tokens=999,
            completion_tokens=1,
            total_tokens=1000,
        )

    def setUp(self):
        self.client.force_authenticate(self.member)

    def _summary(self, **params):
        params.setdefault("organization", self.org.id)
        params.setdefault("window", "all_time")
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return self.client.get(f"/api/ai-usage/summary/?{query}")

    def test_totals_and_breakdowns_reconcile(self):
        response = self._summary()
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        # response.data is the native dict (snake_case); the CamelCase renderer
        # only transforms the wire JSON.
        totals = response.data["totals"]
        self.assertEqual(totals["tokens"], 370)  # 120 + 250, other org excluded
        self.assertEqual(totals["cost"], 0.01)  # NULL self-hosted row ignored
        self.assertEqual(totals["calls"], 2)
        self.assertEqual(totals["avg_tokens_per_call"], 185)

        models = {row["model"] for row in response.data["by_model"]}
        self.assertEqual(models, {"local-model", "claude-sonnet-4-6"})
        # by-feature tokens sum back to the headline.
        self.assertEqual(
            sum(row["tokens"] for row in response.data["by_feature"]), 370
        )

    def test_requires_organization_param(self):
        response = self.client.get("/api/ai-usage/summary/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_view_non_member_org(self):
        response = self._summary(organization=self.other_org.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_window_is_rejected(self):
        response = self._summary(window="yearly")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
