"""
Serializers for threat_models app.
"""

from rest_framework import serializers

from .models import (
    OutOfScopeItem,
    ThreatModel,
    ThreatModelFramework,
    ThreatModelOrgsystem,
    ThreatModelReferenceImage,
    ThreatModelRelationship,
)


class ThreatModelReferenceImageSerializer(serializers.ModelSerializer):
    """Serializer for ThreatModelReferenceImage model."""

    image_url = serializers.SerializerMethodField()
    uploaded_by_email = serializers.CharField(source="uploaded_by.email", read_only=True)

    class Meta:
        model = ThreatModelReferenceImage
        fields = [
            "id",
            "threat_model",
            "image",
            "image_url",
            "filename",
            "description",
            "display_order",
            "uploaded_by",
            "uploaded_by_email",
            "created_at",
        ]
        read_only_fields = ["id", "threat_model", "uploaded_by", "created_at"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ThreatModelReferenceImageUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading reference images."""

    class Meta:
        model = ThreatModelReferenceImage
        fields = ["image", "filename", "description"]


class ThreatModelSerializer(serializers.ModelSerializer):
    """Serializer for ThreatModel model."""

    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    owning_team_name = serializers.CharField(
        source="owning_team.name", read_only=True, allow_null=True
    )
    dfds = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    frameworks = serializers.SerializerMethodField()
    system_ids = serializers.SerializerMethodField()
    referenced_model_ids = serializers.SerializerMethodField()
    reference_images = ThreatModelReferenceImageSerializer(many=True, read_only=True)

    class Meta:
        model = ThreatModel
        fields = [
            "id",
            "name",
            "description",
            "version",
            "status",
            "trigger",
            "criticality",
            "organization",
            "owning_team",
            "owning_team_name",
            "created_by",
            "created_by_email",
            "owner",
            "previous_version",
            "modeling_mode",
            "workspace_data",
            "format_metadata",
            "scope_locked",
            "scope_locked_at",
            "dfds",
            "frameworks",
            "system_ids",
            "referenced_model_ids",
            "reference_images",
            "risk_scoring_method",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by_email", "owner", "owning_team_name"]

    def get_dfds(self, obj):
        """Get associated DFDs with canvas_data for threat analysis."""
        from apps.diagrams.serializers import DFDSerializer

        dfd_associations = obj.dfd_associations.select_related("dfd").all()
        return DFDSerializer([assoc.dfd for assoc in dfd_associations], many=True).data

    def get_owner(self, obj):
        """Get owner name from created_by user."""
        if obj.created_by:
            return obj.created_by.email
        return None

    def get_frameworks(self, obj):
        """Get associated framework names."""
        associations = obj.framework_associations.select_related("framework").all()
        return [assoc.framework.name for assoc in associations]

    def get_system_ids(self, obj):
        """Get associated system IDs."""
        associations = obj.orgsystem_associations.all()
        return [str(assoc.orgsystem_id) for assoc in associations]

    def get_referenced_model_ids(self, obj):
        """Get referenced threat model IDs."""
        associations = obj.outgoing_relationships.filter(
            relation_type=ThreatModelRelationship.RelationType.RELATED_TO
        ).all()
        return [str(assoc.target_threat_model_id) for assoc in associations]

    def _compute_progress_checklist(self, instance):
        """Compute progress checklist from actual data state."""
        from apps.systems.models import OrgsystemComponent
        from apps.threats.models import (
            ComponentInstanceCountermeasure,
            ComponentInstanceThreat,
            DataFlowInstanceThreat,
            FlowInstanceCountermeasure,
        )

        # Extract component_ids and dataflow_ids from DFD canvas data
        dfd_associations = instance.dfd_associations.select_related("dfd").all()
        component_ids = set()
        dataflow_ids = set()
        has_process_or_datastore = False
        has_trust_zone = False
        has_edges = False

        for assoc in dfd_associations:
            canvas_data = assoc.dfd.canvas_data or {}
            for node in canvas_data.get("nodes", []):
                node_type = node.get("type", "")
                if node_type in ("process", "datastore"):
                    has_process_or_datastore = True
                if node_type == "trustZone":
                    has_trust_zone = True
                component_id = node.get("data", {}).get("component_id")
                if component_id:
                    component_ids.add(component_id)

            edges = canvas_data.get("edges", [])
            if edges:
                has_edges = True
            for edge in edges:
                dataflow_id = edge.get("data", {}).get("dataflow_id")
                if dataflow_id:
                    dataflow_ids.add(dataflow_id)

        # Include analysis-only components
        analysis_component_ids = OrgsystemComponent.objects.filter(
            threat_model=instance
        ).exclude(
            id__in=component_ids
        ).values_list("id", flat=True)
        component_ids.update(analysis_component_ids)

        component_ids = list(component_ids)
        dataflow_ids = list(dataflow_ids)

        # Compute each checklist item
        assets_defined = instance.data_assets.exists()
        components_identified = has_process_or_datastore
        trust_boundaries_identified = has_trust_zone
        data_flows_defined = has_edges

        threats_linked_components = ComponentInstanceThreat.objects.filter(
            component_id__in=component_ids, is_dismissed=False
        ).exists() if component_ids else False

        threats_linked_flows = DataFlowInstanceThreat.objects.filter(
            data_flow_id__in=dataflow_ids, is_dismissed=False
        ).exists() if dataflow_ids else False

        owners_assigned = False
        countermeasures_assigned = False
        if component_ids:
            component_cm_qs = ComponentInstanceCountermeasure.objects.filter(
                instance_threat__component_id__in=component_ids
            )
            if component_cm_qs.exists():
                countermeasures_assigned = True
            if component_cm_qs.filter(assigned_owner__isnull=False).exists():
                owners_assigned = True

        if not countermeasures_assigned and dataflow_ids:
            if FlowInstanceCountermeasure.objects.filter(
                flow_threat__data_flow_id__in=dataflow_ids
            ).exists():
                countermeasures_assigned = True

        if not owners_assigned and dataflow_ids:
            if FlowInstanceCountermeasure.objects.filter(
                flow_threat__data_flow_id__in=dataflow_ids,
                assigned_owner__isnull=False,
            ).exists():
                owners_assigned = True

        checklist_items = [
            {"id": "assets_defined", "label": "Primary assets defined", "checked": assets_defined, "auto_computed": True},
            {"id": "components_identified", "label": "Components identified", "checked": components_identified, "auto_computed": True},
            {"id": "trust_boundaries_identified", "label": "Trust boundaries identified", "checked": trust_boundaries_identified, "auto_computed": True},
            {"id": "data_flows_defined", "label": "Data flows defined", "checked": data_flows_defined, "auto_computed": True},
            {"id": "threats_linked_components", "label": "Threats linked to components", "checked": threats_linked_components, "auto_computed": True},
            {"id": "threats_linked_flows", "label": "Threats linked to flows", "checked": threats_linked_flows, "auto_computed": True},
            {"id": "owners_assigned", "label": "Owners assigned", "checked": owners_assigned, "auto_computed": True},
            {"id": "countermeasures_assigned", "label": "Countermeasures assigned", "checked": countermeasures_assigned, "auto_computed": True},
        ]

        return checklist_items

    def to_representation(self, instance):
        """Override to inject computed progress checklist into workspace_data."""
        data = super().to_representation(instance)
        workspace_data = data.get("workspace_data") or {}
        workspace_data["progress_checklist"] = self._compute_progress_checklist(instance)
        data["workspace_data"] = workspace_data
        return data


class ThreatModelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for ThreatModel listing."""

    owner = serializers.SerializerMethodField()
    owning_team_name = serializers.CharField(
        source="owning_team.name", read_only=True, allow_null=True
    )
    frameworks = serializers.SerializerMethodField()

    class Meta:
        model = ThreatModel
        fields = [
            "id",
            "name",
            "description",
            "status",
            "criticality",
            "owner",
            "owning_team",
            "owning_team_name",
            "frameworks",
            "risk_scoring_method",
            "created_at",
            "updated_at",
        ]

    def get_owner(self, obj):
        """Get owner email."""
        if obj.created_by:
            return obj.created_by.email
        return None

    def get_frameworks(self, obj):
        """Get associated framework names."""
        associations = obj.framework_associations.select_related("framework").all()
        return [assoc.framework.name for assoc in associations]


class ThreatModelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ThreatModel."""

    framework_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )
    system_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )
    referenced_model_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model = ThreatModel
        fields = [
            "id",
            "name",
            "description",
            "organization",
            "owning_team",
            "criticality",
            "modeling_mode",
            "framework_ids",
            "system_ids",
            "referenced_model_ids",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "organization": {"required": False},
            "owning_team": {"required": False},
            "criticality": {"required": False},
            "modeling_mode": {"required": False},
        }

    def create(self, validated_data):
        """Create threat model with all relationships."""
        framework_ids = validated_data.pop("framework_ids", [])
        system_ids = validated_data.pop("system_ids", [])
        referenced_model_ids = validated_data.pop("referenced_model_ids", [])

        # Set created_by from request user
        user = self.context["request"].user
        validated_data["created_by"] = user

        # Auto-assign organization from user's first membership if not provided
        if "organization" not in validated_data or validated_data["organization"] is None:
            first_membership = user.organization_memberships.first()
            if first_membership:
                validated_data["organization"] = first_membership.organization
            else:
                raise serializers.ValidationError(
                    {"organization": "User has no organization membership."}
                )

        # Auto-assign owning_team if not provided
        if "owning_team" not in validated_data or validated_data["owning_team"] is None:
            from apps.organizations.models import TeamMembership

            org = validated_data["organization"]
            user_team_memberships = TeamMembership.objects.filter(
                user=user,
                team__organization=org,
            ).select_related("team")
            if user_team_memberships.count() == 1:
                validated_data["owning_team"] = user_team_memberships.first().team

        # Initialize workspace_data — only progressChecklist remains here;
        # status, description, scope_locked, assets, out_of_scope_items
        # are now managed via dedicated model fields and API endpoints.
        validated_data["workspace_data"] = {
            "progress_checklist": [],
        }

        # Create the threat model
        threat_model = super().create(validated_data)

        # Create framework associations
        for framework_id in framework_ids:
            ThreatModelFramework.objects.create(
                threat_model=threat_model,
                framework_id=framework_id,
            )

        # Create system associations
        for system_id in system_ids:
            ThreatModelOrgsystem.objects.create(
                threat_model=threat_model,
                orgsystem_id=system_id,
            )

        # Create threat model references
        for ref_model_id in referenced_model_ids:
            ThreatModelRelationship.objects.create(
                source_threat_model=threat_model,
                target_threat_model_id=ref_model_id,
                relation_type=ThreatModelRelationship.RelationType.RELATED_TO,
            )

        return threat_model


class OutOfScopeItemSerializer(serializers.ModelSerializer):
    """Serializer for OutOfScopeItem model."""

    class Meta:
        model = OutOfScopeItem
        fields = [
            "id",
            "threat_model",
            "name",
            "reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "threat_model", "created_at", "updated_at"]
