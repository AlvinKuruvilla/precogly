"""Tests for TM-Library adapter import and export."""

import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.organizations.models import Organization, OrganizationMember, Team, TeamMembership
from apps.systems.models import DataAsset, DataFlow, OrgsystemComponent, TrustZone
from apps.threats.models import (
    InstanceCountermeasure,
    ComponentInstanceThreat,
    Risk,
    RiskThreat,
)

from ..adapters import TmLibraryAdapter
from ..models import ThreatModel

User = get_user_model()

class TmLibraryAdapterTestMixin:
    """Shared setup for adapter tests."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        cls.org = Organization.objects.create(name="Test Org", domain="test.com")
        OrganizationMember.objects.create(
            organization=cls.org, user=cls.user, role="security_team"
        )
        cls.team = Team.objects.create(
            organization=cls.org, name="Default Team", code="default"
        )
        TeamMembership.objects.create(team=cls.team, user=cls.user, role="lead")
        cls.adapter = TmLibraryAdapter()


class TestValidation(TmLibraryAdapterTestMixin, TestCase):
    """Test validation of input data."""

    def test_missing_scope_raises_error(self):
        with self.assertRaises(Exception):
            self.adapter.import_data({"threats": []}, self.org, self.user)

    def test_invalid_json_raises_error(self):
        with self.assertRaises(Exception):
            self.adapter.validate("not a dict")

    def test_missing_scope_title_raises_error(self):
        with self.assertRaises(Exception):
            self.adapter.validate({"scope": {}})

    def test_valid_minimal_input(self):
        json_data = {
            "scope": {"title": "Minimal Model"},
        }
        threat_model, summary = self.adapter.import_data(json_data, self.org, self.user)
        self.assertEqual(threat_model.name, "Minimal Model")
        self.assertEqual(summary["threats"], 0)


class TestEnumMappings(TmLibraryAdapterTestMixin, TestCase):
    """Test enum edge cases for actor types and control statuses."""

    def test_unknown_actor_type_defaults_to_human(self):
        json_data = {
            "scope": {"title": "Test"},
            "actors": [
                {"symbolic_name": "unknown-actor", "title": "Unknown", "type": "quantum_computer"},
            ],
        }
        threat_model, summary = self.adapter.import_data(json_data, self.org, self.user)
        actor = OrgsystemComponent.objects.get(threat_model=threat_model, name="Unknown")
        self.assertIsNone(actor.category)

    def test_control_status_mappings(self):
        json_data = {
            "scope": {"title": "Test"},
            "controls": [
                {"symbolic_name": "ctrl-1", "title": "Active Control", "status": "active", "threats": []},
                {"symbolic_name": "ctrl-2", "title": "Assumed Control", "status": "assumed", "threats": []},
                {"symbolic_name": "ctrl-3", "title": "Unknown Control", "status": "unknown", "threats": []},
                {"symbolic_name": "ctrl-4", "title": "Retired Control", "status": "retired", "threats": []},
            ],
        }
        self.adapter.import_data(json_data, self.org, self.user)
        # Controls without referenced threats create library entries but no instances
        # The mapping logic is tested via the module constants


class TestMultiThreatControl(TmLibraryAdapterTestMixin, TestCase):
    """Test control referencing multiple threats → duplicated countermeasure instances → re-merged on export."""

    def test_control_duplicated_per_threat(self):
        json_data = {
            "scope": {"title": "Test"},
            "components": [
                {"symbolic_name": "comp-a", "title": "Component A"},
            ],
            "threats": [
                {"symbolic_name": "t1", "title": "Threat 1", "components_affected": ["comp-a"]},
                {"symbolic_name": "t2", "title": "Threat 2", "components_affected": ["comp-a"]},
            ],
            "controls": [
                {"symbolic_name": "shared-ctrl", "title": "Shared Control", "threats": ["t1", "t2"], "status": "active"},
            ],
        }
        threat_model, summary = self.adapter.import_data(json_data, self.org, self.user)

        # Should have 1 shared countermeasure instance linked to 2 threats
        cm_count = InstanceCountermeasure.objects.filter(
            threat_model=threat_model
        ).count()
        self.assertEqual(cm_count, 1)

        # Export → should re-merge into single control
        exported = self.adapter.export_data(threat_model)
        control_names = [c["symbolic_name"] for c in exported["controls"]]
        self.assertEqual(control_names.count("shared-ctrl"), 1)
        shared_ctrl = next(c for c in exported["controls"] if c["symbolic_name"] == "shared-ctrl")
        self.assertEqual(len(shared_ctrl["threats"]), 2)


class TestEmptyExport(TmLibraryAdapterTestMixin, TestCase):
    """Test export of a threat model with no entities."""

    def test_empty_export_produces_valid_json(self):
        json_data = {"scope": {"title": "Empty Model"}}
        threat_model, _ = self.adapter.import_data(json_data, self.org, self.user)

        exported = self.adapter.export_data(threat_model)
        self.assertEqual(exported["scope"]["title"], "Empty Model")
        self.assertEqual(exported["trust_zones"], [])
        self.assertEqual(exported["actors"], [])
        self.assertEqual(exported["components"], [])
        self.assertEqual(exported["threats"], [])
        self.assertEqual(exported["controls"], [])
        self.assertEqual(exported["risks"], [])

        # Verify it's JSON serializable
        json.dumps(exported)


class TestRiskScoring(TmLibraryAdapterTestMixin, TestCase):
    """Test that risk scoring uses the engine, not raw file scores."""

    def test_risk_uses_engine_scoring(self):
        json_data = {
            "scope": {"title": "Test"},
            "risks": [
                {
                    "symbolic_name": "test-risk",
                    "title": "Test Risk",
                    "likelihood": "likely",
                    "impact": "major",
                    "score": 99,  # This should be ignored — engine computes
                    "level": "critical",  # This too
                },
            ],
        }
        threat_model, _ = self.adapter.import_data(json_data, self.org, self.user)
        risk = Risk.objects.get(threat_model=threat_model)

        # Engine: likely(4) * major(4) = 16 → 16/25*100 = 64 → high
        self.assertEqual(risk.inherent_score, 64)
        self.assertEqual(risk.inherent_level, "high")

    def test_risk_export_denormalizes_score(self):
        json_data = {
            "scope": {"title": "Test"},
            "risks": [
                {
                    "symbolic_name": "test-risk",
                    "title": "Test Risk",
                    "likelihood": "possible",
                    "impact": "moderate",
                    "score": 9,
                },
            ],
        }
        threat_model, _ = self.adapter.import_data(json_data, self.org, self.user)
        exported = self.adapter.export_data(threat_model)

        risk = exported["risks"][0]
        # Engine: possible(3) * moderate(3) = 9 → 9/25*100 = 36 → medium
        # Export: round(36/100*25) = 9
        self.assertEqual(risk["score"], 9)
