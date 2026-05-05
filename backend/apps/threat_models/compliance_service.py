"""
Compliance drift detection and refresh service.

Compares instance-level compliance mappings against their library sources
and syncs them when requested.
"""

from django.db import transaction

from apps.compliance.models import CountermeasureLibraryStandard
from apps.threats.models import (
    ComponentInstanceCountermeasure,
    ComponentInstanceCountermeasureStandard,
    FlowInstanceCountermeasure,
    FlowInstanceCountermeasureStandard,
)
from apps.threat_models.report_service import _get_scoped_ids


def _get_non_orphaned_countermeasures(threat_model):
    """
    Return non-orphaned component and flow countermeasures scoped to this
    threat model, with their library standards prefetched.
    """
    component_ids, dataflow_ids = _get_scoped_ids(threat_model)

    component_countermeasures = (
        ComponentInstanceCountermeasure.objects.filter(
            instance_threat__component_id__in=component_ids,
            countermeasure_library__isnull=False,
        )
        .select_related("countermeasure_library")
        .prefetch_related(
            "instance_standard_mappings",
            "countermeasure_library__standard_mappings__requirement__framework",
        )
    )

    flow_countermeasures = (
        FlowInstanceCountermeasure.objects.filter(
            flow_threat__data_flow_id__in=dataflow_ids,
            countermeasure_library__isnull=False,
        )
        .select_related("countermeasure_library")
        .prefetch_related(
            "instance_standard_mappings",
            "countermeasure_library__standard_mappings__requirement__framework",
        )
    )

    return component_countermeasures, flow_countermeasures


def _compute_drift_for_countermeasure(instance_mappings, library_standards):
    """
    Compare instance mappings against library standards for a single
    countermeasure. Returns (additions, removals, updates) counts.
    """
    # Build lookup: requirement_id -> sufficiency for instance mappings
    instance_by_req = {
        mapping.requirement_id: mapping.sufficiency
        for mapping in instance_mappings
        if mapping.requirement_id is not None
    }

    # Build lookup: requirement_id -> sufficiency for library standards
    library_by_req = {
        ls.requirement_id: ls.sufficiency
        for ls in library_standards
    }

    additions = 0
    removals = 0
    updates = 0

    # Standards in library but not in instance -> additions
    for req_id, sufficiency in library_by_req.items():
        if req_id not in instance_by_req:
            additions += 1
        elif instance_by_req[req_id] != sufficiency:
            updates += 1

    # Standards in instance but not in library -> removals
    for req_id in instance_by_req:
        if req_id not in library_by_req:
            removals += 1

    return additions, removals, updates


def check_compliance_drift(threat_model):
    """
    Check for compliance drift between instance and library mappings.

    Returns a summary dict with drift statistics.
    """
    component_cms, flow_cms = _get_non_orphaned_countermeasures(threat_model)

    total_additions = 0
    total_removals = 0
    total_updates = 0
    affected_countermeasures = 0

    for cm in component_cms:
        instance_mappings = cm.instance_standard_mappings.all()
        library_standards = cm.countermeasure_library.standard_mappings.all()
        additions, removals, updates = _compute_drift_for_countermeasure(
            instance_mappings, library_standards
        )
        if additions or removals or updates:
            affected_countermeasures += 1
            total_additions += additions
            total_removals += removals
            total_updates += updates

    for cm in flow_cms:
        instance_mappings = cm.instance_standard_mappings.all()
        library_standards = cm.countermeasure_library.standard_mappings.all()
        additions, removals, updates = _compute_drift_for_countermeasure(
            instance_mappings, library_standards
        )
        if additions or removals or updates:
            affected_countermeasures += 1
            total_additions += additions
            total_removals += removals
            total_updates += updates

    has_drift = (total_additions + total_removals + total_updates) > 0

    return {
        "has_drift": has_drift,
        "total_additions": total_additions,
        "total_removals": total_removals,
        "total_updates": total_updates,
        "affected_countermeasures": affected_countermeasures,
    }


def _sync_instance_standards(countermeasure, instance_model_class, fk_field_name):
    """
    Sync a single countermeasure's instance standards with its library source.
    Returns (added, removed, updated) counts.
    """
    library_standards = CountermeasureLibraryStandard.objects.filter(
        countermeasure_library=countermeasure.countermeasure_library,
    ).select_related("requirement", "requirement__framework")

    instance_mappings = countermeasure.instance_standard_mappings.all()

    # Build lookups
    instance_by_req = {
        mapping.requirement_id: mapping
        for mapping in instance_mappings
        if mapping.requirement_id is not None
    }
    library_by_req = {
        ls.requirement_id: ls
        for ls in library_standards
    }

    added = 0
    removed = 0
    updated = 0

    # Add missing mappings from library
    to_create = []
    for req_id, ls in library_by_req.items():
        if req_id not in instance_by_req:
            to_create.append(
                instance_model_class(
                    **{fk_field_name: countermeasure},
                    requirement=ls.requirement,
                    sufficiency=ls.sufficiency,
                    section_code=ls.requirement.section_code,
                    framework_name=ls.requirement.framework.name,
                    requirement_description=ls.requirement.description,
                )
            )
        elif instance_by_req[req_id].sufficiency != ls.sufficiency:
            # Update changed sufficiency
            mapping = instance_by_req[req_id]
            mapping.sufficiency = ls.sufficiency
            mapping.save(update_fields=["sufficiency"])
            updated += 1

    if to_create:
        instance_model_class.objects.bulk_create(to_create, ignore_conflicts=True)
        added = len(to_create)

    # Remove mappings no longer in library
    orphaned_req_ids = [
        req_id for req_id in instance_by_req if req_id not in library_by_req
    ]
    if orphaned_req_ids:
        removed = countermeasure.instance_standard_mappings.filter(
            requirement_id__in=orphaned_req_ids
        ).delete()[0]

    return added, removed, updated


@transaction.atomic
def refresh_compliance_standards(threat_model):
    """
    Sync all instance-level compliance mappings with their library sources.

    Adds missing mappings, removes deleted mappings, and updates changed
    sufficiency values. Returns a summary of changes made.
    """
    component_cms, flow_cms = _get_non_orphaned_countermeasures(threat_model)

    total_added = 0
    total_removed = 0
    total_updated = 0
    countermeasures_affected = 0

    for cm in component_cms:
        added, removed, updated = _sync_instance_standards(
            cm,
            ComponentInstanceCountermeasureStandard,
            "component_countermeasure",
        )
        if added or removed or updated:
            countermeasures_affected += 1
            total_added += added
            total_removed += removed
            total_updated += updated

    for cm in flow_cms:
        added, removed, updated = _sync_instance_standards(
            cm,
            FlowInstanceCountermeasureStandard,
            "flow_countermeasure",
        )
        if added or removed or updated:
            countermeasures_affected += 1
            total_added += added
            total_removed += removed
            total_updated += updated

    return {
        "standards_added": total_added,
        "standards_removed": total_removed,
        "standards_updated": total_updated,
        "countermeasures_affected": countermeasures_affected,
    }
