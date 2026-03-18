"""
Seed the database with demo data for new contributors.

Creates a superuser, demo organization, imports library packs,
and creates a sample threat model with an AWS Serverless DFD template.

Usage:
    python manage.py seed
    python manage.py seed --force  (re-import packs even if they exist)
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.organizations.models import Organization, OrganizationMember, Team, TeamMembership
from apps.threat_models.models import ThreatModel
from apps.diagrams.models import DFD, DFDTemplatesLibrary
from apps.diagrams.services import sync_dfd_nodes_to_components
from apps.packs.services import get_libraries_path, import_pack_from_path

User = get_user_model()

DEMO_EMAIL = "admin@precogly.dev"
DEMO_PASSWORD = "admin123"
DEMO_ORG_NAME = "Demo Organization"

# Import order matters: taxonomies first, then frameworks, then full packs
TAXONOMY_PACKS = [
    "stride-taxonomy",
    "mini-capec",
    "mini-cwe",
    "mini-attack",
]

FRAMEWORK_PACKS = [
    "frameworks/owasp",
    "frameworks/soc2",
    "frameworks/nist-csf",
    "frameworks/cra",
    "frameworks/mini-asvs",
]

FULL_PACKS = [
    "aws-mini",
]

DFD_TEMPLATE_SLUG = "aws-mini/aws-serverless"
THREAT_MODEL_NAME = "Sample Threat Model"


class Command(BaseCommand):
    help = "Seed database with demo data for development"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-import packs even if they already exist",
        )

    def handle(self, *args, **options):
        force = options["force"]

        org = self._create_org()
        user = self._create_superuser()
        team = self._setup_membership(org, user)
        self._import_packs(force)
        self._create_sample_threat_model(org, team, user)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Seed complete!"))
        self.stdout.write(f"  Login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        self.stdout.write(f"  URL:   http://localhost:5173")

    def _create_org(self):
        # A migration may have already created a primary org. Use it if so.
        org = Organization.objects.filter(is_primary=True).first()
        if org:
            if org.name != DEMO_ORG_NAME:
                org.name = DEMO_ORG_NAME
                org.save(update_fields=["name"])
            self.stdout.write(f"Using existing primary organization: {org.name}")
        else:
            org = Organization.objects.create(
                name=DEMO_ORG_NAME,
                plan=Organization.Plan.FREE,
                is_primary=True,
            )
            self.stdout.write(self.style.SUCCESS(f"Created organization: {DEMO_ORG_NAME}"))

        # Ensure a default team exists
        if not Team.objects.filter(organization=org, is_default=True).exists():
            Team.objects.create(
                organization=org,
                name="My Team",
                is_default=True,
            )
        return org

    def _create_superuser(self):
        if User.objects.filter(email=DEMO_EMAIL).exists():
            self.stdout.write(f"Superuser already exists: {DEMO_EMAIL}")
            return User.objects.get(email=DEMO_EMAIL)

        user = User.objects.create_superuser(
            username=DEMO_EMAIL,
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
        )
        self.stdout.write(self.style.SUCCESS(f"Created superuser: {DEMO_EMAIL}"))
        return user

    def _setup_membership(self, org, user):
        # The post_save signal may have already added the user to the primary org.
        # Ensure they have SECURITY_TEAM role.
        membership, created = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={"role": OrganizationMember.Role.SECURITY_TEAM},
        )
        if not created and membership.role != OrganizationMember.Role.SECURITY_TEAM:
            membership.role = OrganizationMember.Role.SECURITY_TEAM
            membership.save()

        default_team = Team.objects.filter(organization=org, is_default=True).first()
        if default_team:
            team_membership, _ = TeamMembership.objects.get_or_create(
                team=default_team,
                user=user,
                defaults={"role": TeamMembership.Role.LEAD},
            )
            if team_membership.role != TeamMembership.Role.LEAD:
                team_membership.role = TeamMembership.Role.LEAD
                team_membership.save()

        return default_team

    def _import_packs(self, force):
        libraries_path = get_libraries_path()
        if not libraries_path.exists():
            self.stdout.write(self.style.ERROR(
                f"Libraries path not found: {libraries_path}"
            ))
            return

        all_packs = TAXONOMY_PACKS + FRAMEWORK_PACKS + FULL_PACKS
        for pack_slug in all_packs:
            pack_path = libraries_path / pack_slug
            if not pack_path.exists():
                self.stdout.write(self.style.WARNING(f"Pack not found: {pack_slug}"))
                continue

            result = import_pack_from_path(
                pack_path=pack_path,
                force=force,
                selected_overlays=None,  # Load all overlays
            )
            if result.success:
                self.stdout.write(self.style.SUCCESS(f"Imported: {pack_slug}"))
            else:
                self.stdout.write(self.style.WARNING(f"Skipped: {pack_slug} — {result.message}"))

    def _create_sample_threat_model(self, org, team, user):
        if ThreatModel.objects.filter(name=THREAT_MODEL_NAME, organization=org).exists():
            self.stdout.write(f"Threat model already exists: {THREAT_MODEL_NAME}")
            return

        template = DFDTemplatesLibrary.objects.filter(
            qualified_slug=DFD_TEMPLATE_SLUG
        ).first()
        if not template:
            self.stdout.write(self.style.WARNING(
                f"DFD template not found: {DFD_TEMPLATE_SLUG}. "
                "Threat model created without diagram."
            ))
            ThreatModel.objects.create(
                organization=org,
                owning_team=team,
                created_by=user,
                name=THREAT_MODEL_NAME,
                description="A sample threat model to explore Precogly's features.",
                criticality=ThreatModel.Criticality.HIGH,
            )
            return

        threat_model = ThreatModel.objects.create(
            organization=org,
            owning_team=team,
            created_by=user,
            name=THREAT_MODEL_NAME,
            description="A sample threat model to explore Precogly's features.",
            criticality=ThreatModel.Criticality.HIGH,
        )

        dfd = DFD.objects.create(
            name="Data Flow Diagram 1",
            diagram_type=template.diagram_type,
            threat_model=threat_model,
            template_library=template,
            canvas_data=template.canvas_data,
            is_primary=True,
            updated_by=user,
        )

        sync_result = sync_dfd_nodes_to_components(dfd, threat_model)
        components_count = sync_result.get("created_count", 0)
        threats_count = sync_result.get("threats_generated", 0)

        self.stdout.write(self.style.SUCCESS(
            f"Created: {THREAT_MODEL_NAME} "
            f"({components_count} components, {threats_count} threats)"
        ))
