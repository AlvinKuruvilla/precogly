"""REST API for managing an organization's AI provider configs.

This is the settings-UI counterpart to the Django admin: organization members
manage their own "bring your own model" endpoints here, and probe them with a
server-side "test connection" action so the stored API key never travels back to
the browser.

Two invariants are enforced in the view rather than left to the database to
reject with a 500:

* **Tenancy** — a member can only see and touch configs for organizations they
  belong to. The FK to ``organization`` is otherwise unconstrained, so we check
  membership on every write.
* **One default per org** — the model has a DB constraint to that effect, but a
  naive "save with ``is_default=True``" would hit it as an IntegrityError. We
  instead clear any existing default in the same transaction before saving, so
  flipping the default is a clean, single API call.
"""

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIProviderConfig
from .providers.base import AIProviderError
from .providers.registry import build_provider
from .serializers import AIProviderConfigSerializer


class AIProviderConfigViewSet(viewsets.ModelViewSet):
    """CRUD for per-tenant AI provider configs, plus a connection probe."""

    serializer_class = AIProviderConfigSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["organization", "enabled", "is_default"]
    search_fields = ["name", "model", "base_url"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Only configs for organizations the requesting user belongs to."""
        return AIProviderConfig.objects.filter(
            organization_id__in=self._member_org_ids()
        ).select_related("organization")

    def _member_org_ids(self):
        return set(
            self.request.user.organization_memberships.values_list(
                "organization_id", flat=True
            )
        )

    def _require_member(self, organization) -> None:
        """Reject writes that target an org the user isn't a member of.

        Without this, the unconstrained ``organization`` FK would let a member
        create or move a config into an organization they have no relationship
        with. ``get_queryset`` already hides other orgs' configs on read; this is
        the matching guard on write.
        """
        if organization is None or organization.id not in self._member_org_ids():
            raise PermissionDenied(
                "You can only manage AI providers for organizations you belong to."
            )

    def perform_create(self, serializer):
        organization = serializer.validated_data.get("organization")
        self._require_member(organization)
        self._save_with_key_and_default(serializer, organization)

    def perform_update(self, serializer):
        # On PATCH the org may be absent from the payload; fall back to the
        # existing one so the membership check and default-clearing still target
        # the right tenant.
        organization = serializer.validated_data.get(
            "organization", serializer.instance.organization
        )
        self._require_member(organization)
        self._save_with_key_and_default(serializer, organization)

    def _save_with_key_and_default(self, serializer, organization) -> None:
        """Persist the config, honoring the write-only key and single-default rule.

        ``api_key`` is a write-only serializer field with no model setter, so it
        must be pulled out before the model is saved and applied through
        :meth:`AIProviderConfig.set_api_key`. A blank value means "keep the
        stored key", matching the UI's masked "leave blank to keep" affordance.
        """
        raw_key = serializer.validated_data.pop("api_key", "")
        making_default = serializer.validated_data.get("is_default", False)

        with transaction.atomic():
            if making_default:
                self._clear_other_defaults(
                    organization, exclude_pk=getattr(serializer.instance, "pk", None)
                )
            config = serializer.save()
            if raw_key:
                try:
                    config.set_api_key(raw_key)
                except ImproperlyConfigured as err:
                    # Storing a key needs AI_SECRET_KEY configured on the server.
                    # Surface that as a 400 the operator can act on rather than a
                    # 500; raising here also rolls back the half-saved row.
                    raise serializers.ValidationError({"api_key": str(err)}) from err
                config.save(update_fields=["api_key_encrypted"])

    @staticmethod
    def _clear_other_defaults(organization, *, exclude_pk=None) -> None:
        """Demote any current default in ``organization`` before promoting a new one."""
        others = AIProviderConfig.objects.filter(
            organization=organization, is_default=True
        )
        if exclude_pk is not None:
            others = others.exclude(pk=exclude_pk)
        others.update(is_default=False)

    @action(detail=True, methods=["post"], url_path="test-connection")
    def test_connection(self, request, pk=None):
        """Probe the saved endpoint server-side and report reachability.

        Returns HTTP 200 with ``{ok, detail}`` even when the provider is
        unreachable or misconfigured: a failed probe is an expected, inline-
        displayable outcome ("connection refused — is the server running?"), not
        a server error. The stored key stays on the server throughout.
        """
        config = self.get_object()
        try:
            health = build_provider(config.to_resolved_config()).test_connection()
        except AIProviderError as err:
            # Bad provider_type or an undecryptable key (AI_SECRET_KEY changed) —
            # report the actionable message rather than 500-ing.
            return Response({"ok": False, "detail": str(err)})
        return Response({"ok": health.ok, "detail": health.detail})
