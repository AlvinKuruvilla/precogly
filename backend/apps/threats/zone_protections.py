"""
Zone-based countermeasure inheritance analysis and application.

Analyzes trust zone topology to suggest inheriting platform countermeasures
from outer (lower trust_level) zones to inner (higher trust_level) zones.
"""

from django.db.models import Q

from apps.systems.models import TrustBoundary, TrustZone
from apps.threats.models import ComponentInstanceCountermeasure
from apps.threats.services import recalculate_threat_status


def _get_all_outer_zones(zone, visited=None):
    """
    Walk the trust boundary chain outward, collecting all zones with
    lower trust_level. Traverses multiple boundary layers for nested zones.
    """
    if visited is None:
        visited = set()
    visited.add(zone.id)

    outer_zones = []
    boundaries = TrustBoundary.objects.filter(
        Q(zone_a=zone) | Q(zone_b=zone)
    ).select_related("zone_a", "zone_b")

    for boundary in boundaries:
        adjacent = boundary.zone_a if boundary.zone_b_id == zone.id else boundary.zone_b
        if adjacent.id in visited or adjacent.trust_level >= zone.trust_level:
            continue
        outer_zones.append(adjacent)
        outer_zones.extend(_get_all_outer_zones(adjacent, visited))

    return outer_zones


def analyze_zone_protections(threat_model):
    """
    Analyze zone topology for a threat model and return inheritance suggestions.

    For each gap countermeasure on a component in a trust zone, checks if the
    same countermeasure_library has a platform instance on any component in an
    outer (lower trust_level) zone.

    Returns a list of suggestion dicts.
    """
    from apps.systems.models import OrgsystemComponent

    # Replicate component scoping from ThreatModelViewSet.threats
    dfd_associations = threat_model.dfd_associations.select_related("dfd").all()
    component_ids = set()
    for assoc in dfd_associations:
        canvas_data = assoc.dfd.canvas_data or {}
        for node in canvas_data.get("nodes", []):
            component_id = node.get("data", {}).get("component_id")
            if component_id:
                component_ids.add(component_id)

    # Also include analysis-only components
    analysis_only_ids = OrgsystemComponent.objects.filter(
        threat_model=threat_model
    ).exclude(
        id__in=component_ids
    ).values_list("id", flat=True)
    component_ids.update(analysis_only_ids)

    if not component_ids:
        return []

    # Get all gap countermeasures that have a library link and whose
    # component has a trust zone
    gap_countermeasures = ComponentInstanceCountermeasure.objects.filter(
        instance_threat__component_id__in=component_ids,
        instance_threat__component__trust_zone__isnull=False,
        countermeasure_library__isnull=False,
        status="gap",
    ).select_related(
        "instance_threat__component__trust_zone",
        "countermeasure_library",
    )

    if not gap_countermeasures:
        return []

    # Cache outer zones per zone_id
    outer_zones_cache = {}
    suggestions = []

    for gap_cm in gap_countermeasures:
        component = gap_cm.instance_threat.component
        zone = component.trust_zone
        zone_id = zone.id

        if zone_id not in outer_zones_cache:
            outer_zones_cache[zone_id] = _get_all_outer_zones(zone)

        outer_zones = outer_zones_cache[zone_id]
        if not outer_zones:
            continue

        # Find a matching platform countermeasure in outer zones (also in scope)
        source_cm = ComponentInstanceCountermeasure.objects.filter(
            instance_threat__component_id__in=component_ids,
            instance_threat__component__trust_zone__in=outer_zones,
            countermeasure_library=gap_cm.countermeasure_library,
            status="platform",
        ).select_related(
            "instance_threat__component__trust_zone",
            "countermeasure_library",
        ).first()

        if source_cm:
            suggestions.append({
                "target_countermeasure_id": gap_cm.id,
                "target_component_name": component.name,
                "target_zone_name": zone.name,
                "source_component_name": source_cm.instance_threat.component.name,
                "source_zone_name": source_cm.instance_threat.component.trust_zone.name,
                "countermeasure_name": gap_cm.countermeasure_library.name,
                "control_type": gap_cm.countermeasure_library.control_type,
            })

    return suggestions


def apply_zone_protections(items):
    """
    Apply zone inheritance to selected countermeasures.

    items: list of dicts with countermeasure_id, source_component_name, source_zone_name

    Updates matching gap countermeasures to platform with inheritance metadata,
    then recalculates threat statuses for affected threats.
    """
    if not items:
        return {"updated_count": 0}

    updated_count = 0
    affected_threats = set()

    for item in items:
        countermeasure_id = item.get("countermeasure_id")
        source_component_name = item.get("source_component_name", "")
        source_zone_name = item.get("source_zone_name", "")

        count = ComponentInstanceCountermeasure.objects.filter(
            id=countermeasure_id,
            status="gap",
        ).update(
            status="platform",
            is_inherited=True,
            inherited_from_component_name=source_component_name,
            inherited_from_zone_name=source_zone_name,
        )
        updated_count += count

        if count > 0:
            try:
                cm = ComponentInstanceCountermeasure.objects.select_related(
                    "instance_threat"
                ).get(id=countermeasure_id)
                affected_threats.add(cm.instance_threat_id)
            except ComponentInstanceCountermeasure.DoesNotExist:
                pass

    # Recalculate threat statuses for all affected threats
    from apps.threats.models import ComponentInstanceThreat

    for threat_id in affected_threats:
        try:
            threat = ComponentInstanceThreat.objects.get(id=threat_id)
            recalculate_threat_status(threat)
        except ComponentInstanceThreat.DoesNotExist:
            pass

    return {"updated_count": updated_count}
