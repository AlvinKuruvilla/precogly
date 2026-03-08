"""
Core permission classes for RBAC.
"""

from rest_framework import permissions


class IsSecurityTeam(permissions.BasePermission):
    """
    Restricts write operations to security team members.
    Read operations are allowed for all authenticated users.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return request.user.organization_memberships.filter(
            role="security_team",
        ).exists()


class CanWrite(permissions.BasePermission):
    """
    Allows read access to all authenticated users.
    Security team members get unconditional write access.
    Regular members must have a non-viewer team role for the object's owning team.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        organization = self._get_organization(obj)
        if organization is None:
            return True

        # Check org-level role
        org_membership = request.user.organization_memberships.filter(
            organization=organization
        ).first()
        if org_membership is None:
            return False

        # Security team gets unconditional write access
        if org_membership.role == "security_team":
            return True

        # Regular members: check team role for the object's owning team
        owning_team = self._get_owning_team(obj)
        if owning_team is None:
            return False

        from apps.organizations.models import TeamMembership
        team_membership = TeamMembership.objects.filter(
            user=request.user, team=owning_team
        ).first()
        if team_membership is None:
            return False

        return team_membership.role != "viewer"

    @staticmethod
    def _get_owning_team(obj):
        """Walk FK paths to find the owning team for an object."""
        # Direct owning_team (ThreatModel)
        if hasattr(obj, "owning_team_id") and obj.owning_team_id:
            return obj.owning_team

        # threat_model -> owning_team
        if hasattr(obj, "threat_model_id") and obj.threat_model_id:
            return obj.threat_model.owning_team

        # component -> orgsystem -> threat_model_associations -> threat_model -> owning_team
        threat_model = None
        orgsystem = None
        if hasattr(obj, "component_id") and obj.component_id:
            component = obj.component
            if component and hasattr(component, "orgsystem") and component.orgsystem:
                orgsystem = component.orgsystem
        elif hasattr(obj, "instance_threat_id") and obj.instance_threat_id:
            component = obj.instance_threat.component
            if component and hasattr(component, "orgsystem") and component.orgsystem:
                orgsystem = component.orgsystem
        elif hasattr(obj, "flow_threat_id") and obj.flow_threat_id:
            flow_threat = obj.flow_threat
            if flow_threat and flow_threat.data_flow and flow_threat.data_flow.source_component:
                orgsystem = flow_threat.data_flow.source_component.orgsystem

        if orgsystem:
            # Primary path: orgsystem -> ThreatModelOrgsystem association
            association = orgsystem.threat_model_associations.select_related("threat_model").first()
            if association:
                threat_model = association.threat_model
            else:
                # Fallback: find threat model via the organization
                from apps.threat_models.models import ThreatModel
                organization = orgsystem.organization
                if organization:
                    threat_model = ThreatModel.objects.filter(
                        organization=organization
                    ).first()

        if threat_model and hasattr(threat_model, "owning_team"):
            return threat_model.owning_team

        return None

    @staticmethod
    def _get_organization(obj):
        """Walk FK paths to find the organization for an object."""
        # Direct organization FK
        if hasattr(obj, "organization_id") and obj.organization_id:
            return obj.organization

        # threat_model -> organization
        if hasattr(obj, "threat_model_id") and obj.threat_model_id:
            return obj.threat_model.organization

        # component -> orgsystem -> organization
        if hasattr(obj, "component_id"):
            component = obj.component
            if component and hasattr(component, "orgsystem") and component.orgsystem:
                return component.orgsystem.organization

        # instance_threat -> component -> orgsystem -> organization
        if hasattr(obj, "instance_threat_id"):
            instance_threat = obj.instance_threat
            if instance_threat and instance_threat.component:
                orgsystem = instance_threat.component.orgsystem
                if orgsystem:
                    return orgsystem.organization

        # flow_threat -> data_flow -> source_component -> orgsystem -> organization
        if hasattr(obj, "flow_threat_id"):
            flow_threat = obj.flow_threat
            if flow_threat and flow_threat.data_flow:
                source = flow_threat.data_flow.source_component
                if source and source.orgsystem:
                    return source.orgsystem.organization

        # data_flow -> source_component -> orgsystem -> organization
        if hasattr(obj, "source_component_id"):
            source = obj.source_component
            if source and source.orgsystem:
                return source.orgsystem.organization

        # orgsystem -> organization
        if hasattr(obj, "orgsystem_id") and obj.orgsystem_id:
            return obj.orgsystem.organization

        # orgsystem (the object itself IS an Orgsystem)
        if hasattr(obj, "organization_id") and obj.__class__.__name__ == "Orgsystem":
            return obj.organization

        return None
