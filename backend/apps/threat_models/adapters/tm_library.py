"""TM-Library format adapter — import and export."""

import logging

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .base import BaseAdapter
from .symbolic_name import SymbolicNameResolver

logger = logging.getLogger(__name__)

# --- Enum mappings ---

BUSINESS_CRITICALITY_MAP = {
    "minimal": "low",
    "low": "low",
    "moderate": "medium",
    "high": "high",
    "maximal": "critical",
}
BUSINESS_CRITICALITY_REVERSE = {
    "low": "low",
    "medium": "moderate",
    "high": "high",
    "critical": "maximal",
}

ACTOR_TYPE_TO_CATEGORY = {
    "user": "human_actor",
    "power_user": "human_actor",
    "administrator": "human_actor",
    "engineer": "human_actor",
    "third_party": "human_actor",
    "customer": "human_actor",
    "system": "system_actor",
    "api": "system_actor",
    "legacy": "system_actor",
    "partner": "system_actor",
    "saas": "system_actor",
}
CATEGORY_TO_ACTOR_TYPE = {
    "human_actor": "user",
    "system_actor": "system",
}

CONTROL_STATUS_MAP = {
    "active": "verified",
    "assumed": "platform",
    "suggested": "planned",
    "under_review": "planned",
    "approved": "planned",
    "scheduled": "planned",
    "retired": "waived",
    "wont_do": "waived",
    "unknown": "gap",
}
CONTROL_STATUS_REVERSE = {
    "verified": "active",
    "platform": "assumed",
    "planned": "suggested",
    "waived": "retired",
    "gap": "unknown",
}

CONTROL_PRIORITY_MAP = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
}


def _resolve_flow_endpoint(resolver, endpoint):
    """Resolve a data flow source/destination to an OrgsystemComponent.

    Supports both {type, name} and {type, object} properties.
    """
    entity_type = endpoint.get("type", "")
    symbolic_name = endpoint.get("name") or endpoint.get("object", "")

    type_mapping = {
        "actor": "actor",
        "component": "component",
        "data_store": "data_store",
        "datastore": "data_store",
    }
    resolved_type = type_mapping.get(entity_type, entity_type)
    return resolver.resolve(resolved_type, symbolic_name)


class TmLibraryAdapter(BaseAdapter):
    """Import/export for OWASP TM-Library JSON format."""

    def validate(self, json_data):
        """Validate TM-Library JSON structure before import.

        Structural issues (wrong types, missing required fields) raise
        ValidationError. Cross-reference mismatches are collected as
        warnings and returned — the import handles missing refs gracefully.
        """
        errors = []
        warnings = []

        # --- Top-level structure ---
        if not isinstance(json_data, dict):
            raise ValidationError({"detail": "Input must be a JSON object."})
        if "scope" not in json_data:
            raise ValidationError({"detail": "Missing required 'scope' field."})
        scope = json_data["scope"]
        if not isinstance(scope, dict) or "title" not in scope:
            raise ValidationError({"detail": "scope.title is required."})
        if not scope["title"].strip():
            errors.append("scope.title must not be empty.")

        # --- Collect all symbolic names for cross-reference validation ---
        duplicates = []  # (entity_type, symbolic_name)

        entity_lists = {
            "trust_zones": json_data.get("trust_zones", []),
            "actors": json_data.get("actors", []),
            "components": json_data.get("components", []),
            "data_stores": json_data.get("data_stores", []),
            "data_sets": json_data.get("data_sets", []),
            "data_flows": json_data.get("data_flows", []),
            "threats": json_data.get("threats", []),
            "controls": json_data.get("controls", []),
            "risks": json_data.get("risks", []),
        }

        # Validate each entity list is actually a list
        for list_name, entity_list in entity_lists.items():
            if not isinstance(entity_list, list):
                errors.append(f"'{list_name}' must be an array, got {type(entity_list).__name__}.")

        if errors:
            raise ValidationError({"detail": errors})

        # --- Per-entity validation (structural) ---

        for entity_type, entity_list in entity_lists.items():
            seen_in_type = set()
            for idx, item in enumerate(entity_list):
                if not isinstance(item, dict):
                    errors.append(f"{entity_type}[{idx}]: must be an object.")
                    continue

                sym = item.get("symbolic_name")
                if not sym:
                    errors.append(
                        f"{entity_type}[{idx}]: missing 'symbolic_name' "
                        f"(title: '{item.get('title', '?')}')."
                    )
                    continue

                if not isinstance(sym, str):
                    errors.append(f"{entity_type}[{idx}]: 'symbolic_name' must be a string.")
                    continue

                # Duplicate within same entity type
                if sym in seen_in_type:
                    duplicates.append((entity_type, sym))
                seen_in_type.add(sym)

        if duplicates:
            for entity_type, sym in duplicates:
                errors.append(f"Duplicate symbolic_name '{sym}' in {entity_type}.")

        # Data flows → source/destination must be objects
        for idx, df in enumerate(entity_lists["data_flows"]):
            if not isinstance(df, dict):
                continue
            for endpoint_key in ("source", "destination"):
                endpoint = df.get(endpoint_key, {})
                if endpoint and not isinstance(endpoint, dict):
                    errors.append(
                        f"data_flows[{idx}] '{df.get('symbolic_name', '?')}': "
                        f"{endpoint_key} must be an object."
                    )

        # Assumptions must be objects with description
        for idx, assumption in enumerate(json_data.get("assumptions", [])):
            if not isinstance(assumption, dict):
                errors.append(f"assumptions[{idx}]: must be an object.")
            elif not assumption.get("description", "").strip():
                warnings.append(f"assumptions[{idx}]: empty description.")

        # Trust boundaries must be objects
        for idx, tb in enumerate(json_data.get("trust_boundaries", [])):
            if not isinstance(tb, dict):
                errors.append(f"trust_boundaries[{idx}]: must be an object.")

        if errors:
            raise ValidationError({"detail": errors})

        # --- Cross-reference validation (warnings only) ---

        resolvable_names = set()
        for entity_type in ("trust_zones", "actors", "components", "data_stores", "data_sets"):
            for item in entity_lists[entity_type]:
                if isinstance(item, dict) and item.get("symbolic_name"):
                    resolvable_names.add(item["symbolic_name"])

        trust_zone_names = {
            item.get("symbolic_name")
            for item in entity_lists["trust_zones"]
            if isinstance(item, dict) and item.get("symbolic_name")
        }
        component_names = {
            item.get("symbolic_name")
            for item in entity_lists["components"]
            if isinstance(item, dict) and item.get("symbolic_name")
        }
        threat_names = {
            item.get("symbolic_name")
            for item in entity_lists["threats"]
            if isinstance(item, dict) and item.get("symbolic_name")
        }
        data_store_names = {
            item.get("symbolic_name")
            for item in entity_lists["data_stores"]
            if isinstance(item, dict) and item.get("symbolic_name")
        }

        # Trust boundaries → trust zone references
        for idx, tb in enumerate(json_data.get("trust_boundaries", [])):
            if not isinstance(tb, dict):
                continue
            for side in ("trust_zone_a", "trust_zone_b"):
                ref = tb.get(side)
                if ref and ref not in trust_zone_names:
                    warnings.append(
                        f"trust_boundaries[{idx}].{side}: "
                        f"'{ref}' not found in trust_zones."
                    )

        # Components → trust_zone and parent_component references
        for idx, comp in enumerate(entity_lists["components"]):
            if not isinstance(comp, dict):
                continue
            tz_ref = comp.get("trust_zone")
            if tz_ref and tz_ref not in trust_zone_names:
                warnings.append(
                    f"components[{idx}] '{comp.get('symbolic_name', '?')}': "
                    f"trust_zone '{tz_ref}' not found."
                )
            parent_ref = comp.get("parent_component")
            if parent_ref and parent_ref not in component_names:
                warnings.append(
                    f"components[{idx}] '{comp.get('symbolic_name', '?')}': "
                    f"parent_component '{parent_ref}' not found."
                )

        # Data flows → source/destination references
        for idx, df in enumerate(entity_lists["data_flows"]):
            if not isinstance(df, dict):
                continue
            for endpoint_key in ("source", "destination"):
                endpoint = df.get(endpoint_key, {})
                if not isinstance(endpoint, dict):
                    continue
                ref = endpoint.get("name") or endpoint.get("object")
                if ref and ref not in resolvable_names:
                    warnings.append(
                        f"data_flows[{idx}] '{df.get('symbolic_name', '?')}': "
                        f"{endpoint_key} '{ref}' not found in "
                        f"actors/components/data_stores."
                    )

        # Threats → components_affected references
        for idx, threat in enumerate(entity_lists["threats"]):
            if not isinstance(threat, dict):
                continue
            for comp_ref in threat.get("components_affected", []):
                if comp_ref not in resolvable_names:
                    warnings.append(
                        f"threats[{idx}] '{threat.get('symbolic_name', '?')}': "
                        f"components_affected '{comp_ref}' not found."
                    )

        # Controls → threat references
        for idx, ctrl in enumerate(entity_lists["controls"]):
            if not isinstance(ctrl, dict):
                continue
            for threat_ref in ctrl.get("threats", []):
                if threat_ref not in threat_names:
                    warnings.append(
                        f"controls[{idx}] '{ctrl.get('symbolic_name', '?')}': "
                        f"threat '{threat_ref}' not found in threats."
                    )

        # Data set placements → data_store references
        for idx, ds in enumerate(entity_lists["data_sets"]):
            if not isinstance(ds, dict):
                continue
            for placement in ds.get("placements", []):
                if not isinstance(placement, dict):
                    continue
                store_ref = placement.get("data_store")
                if store_ref and store_ref not in data_store_names:
                    warnings.append(
                        f"data_sets[{idx}] '{ds.get('symbolic_name', '?')}': "
                        f"placement data_store '{store_ref}' not found."
                    )

        return warnings

    def import_data(self, json_data, organization, created_by):
        validation_warnings = self.validate(json_data) or []

        from apps.organizations.models import TeamMembership
        from apps.systems.models import (
            ComponentDataAsset,
            DataAsset,
            DataFlow,
            OrgsystemComponent,
            TrustBoundary,
            TrustZone,
        )
        from apps.threats.models import (
            ComponentInstanceCountermeasure,
            ComponentInstanceThreat,
            CountermeasureLibrary,
            DataFlowInstanceThreat,
            FlowInstanceCountermeasure,
            Risk,
            RiskThreat,
            ThreatLibrary,
        )
        from apps.threats.services import calculate_inherent_score, recalculate_risk

        from ..models import ThreatModel

        resolver = SymbolicNameResolver()
        scope = json_data["scope"]
        summary = {
            "trust_zones": 0,
            "trust_boundaries": 0,
            "actors": 0,
            "components": 0,
            "data_stores": 0,
            "data_assets": 0,
            "data_flows": 0,
            "threats": 0,
            "controls": 0,
            "risks": 0,
            "warnings": list(validation_warnings),
        }

        with transaction.atomic():
            # 1. ThreatModel
            criticality = BUSINESS_CRITICALITY_MAP.get(
                scope.get("business_criticality", "moderate"), "medium"
            )
            threat_model = ThreatModel.objects.create(
                organization=organization,
                created_by=created_by,
                name=scope["title"],
                description=scope.get("description", json_data.get("description", "")),
                risk_scoring_method="tm_library",
                modeling_mode="manual",
                criticality=criticality,
                format_metadata={
                    "tm_library": {
                        "version": json_data.get("version"),
                        "scope": scope,
                        "frozen": json_data.get("frozen", False),
                        "release_docs_link": json_data.get("release_docs_link", ""),
                        "repo_link": json_data.get("repo_link", ""),
                    }
                },
            )

            # Auto-assign team
            user_team_memberships = TeamMembership.objects.filter(
                user=created_by,
                team__organization=organization,
            ).select_related("team")
            if user_team_memberships.count() == 1:
                threat_model.owning_team = user_team_memberships.first().team
                threat_model.save(update_fields=["owning_team"])

            # 2. Trust Zones
            for tz_data in json_data.get("trust_zones", []):
                tz = TrustZone.objects.create(
                    name=tz_data.get("title", tz_data["symbolic_name"]),
                    description=tz_data.get("description", ""),
                    format_metadata={
                        "tm_library": {
                            "symbolic_name": tz_data["symbolic_name"],
                        }
                    },
                )
                resolver.register("trust_zone", tz_data["symbolic_name"], tz)
                summary["trust_zones"] += 1

            # Store zone IDs in threat model for export retrieval
            all_zone_ids = [obj.pk for obj in resolver.get_all("trust_zone").values()]
            if all_zone_ids:
                fm = threat_model.format_metadata
                fm.setdefault("tm_library", {})["zone_ids"] = all_zone_ids
                threat_model.save(update_fields=["format_metadata"])

            # 3. Trust Boundaries
            for tb_data in json_data.get("trust_boundaries", []):
                zone_a = resolver.resolve("trust_zone", tb_data.get("trust_zone_a", ""))
                zone_b = resolver.resolve("trust_zone", tb_data.get("trust_zone_b", ""))
                if zone_a and zone_b:
                    TrustBoundary.objects.create(
                        zone_a=zone_a,
                        zone_b=zone_b,
                        format_metadata={
                            "tm_library": {
                                "access_control_methods": tb_data.get("access_control_methods", []),
                                "authentication_methods": tb_data.get("authentication_methods", []),
                            }
                        },
                    )
                    summary["trust_boundaries"] += 1
                else:
                    summary["warnings"].append(
                        f"Trust boundary skipped: could not resolve zones "
                        f"'{tb_data.get('trust_zone_a')}' / '{tb_data.get('trust_zone_b')}'"
                    )

            # 4. Actors → OrgsystemComponent
            for actor_data in json_data.get("actors", []):
                actor_type = actor_data.get("type", "user")
                category = ACTOR_TYPE_TO_CATEGORY.get(actor_type, "human_actor")
                trust_zone = resolver.resolve("trust_zone", actor_data.get("trust_zone", ""))

                comp = OrgsystemComponent.objects.create(
                    name=actor_data.get("title", actor_data["symbolic_name"]),
                    description=actor_data.get("description", ""),
                    category=category,
                    actor_type=actor_type,
                    trust_zone=trust_zone,
                    threat_model=threat_model,
                    format_metadata={
                        "tm_library": {
                            "symbolic_name": actor_data["symbolic_name"],
                            "permissions": actor_data.get("permissions", ""),
                            "original_type": actor_type,
                        }
                    },
                )
                resolver.register("actor", actor_data["symbolic_name"], comp)
                summary["actors"] += 1

            # 5. Components → OrgsystemComponent (two-pass for parent_component)
            component_entries = json_data.get("components", [])
            # First pass: create all components
            for comp_data in component_entries:
                trust_zone = resolver.resolve("trust_zone", comp_data.get("trust_zone", ""))
                comp = OrgsystemComponent.objects.create(
                    name=comp_data.get("title", comp_data["symbolic_name"]),
                    description=comp_data.get("description", ""),
                    category="process",
                    trust_zone=trust_zone,
                    threat_model=threat_model,
                    format_metadata={
                        "tm_library": {
                            "symbolic_name": comp_data["symbolic_name"],
                            "repo_link": comp_data.get("repo_link", ""),
                        }
                    },
                )
                resolver.register("component", comp_data["symbolic_name"], comp)
                summary["components"] += 1

            # Second pass: resolve parent_component
            for comp_data in component_entries:
                parent_name = comp_data.get("parent_component")
                if parent_name:
                    parent = resolver.resolve("component", parent_name)
                    child = resolver.resolve("component", comp_data["symbolic_name"])
                    if parent and child:
                        child.parent_component = parent
                        child.save(update_fields=["parent_component"])

            # 6. Data Stores → OrgsystemComponent
            for ds_data in json_data.get("data_stores", []):
                trust_zone = resolver.resolve("trust_zone", ds_data.get("trust_zone", ""))
                comp = OrgsystemComponent.objects.create(
                    name=ds_data.get("title", ds_data["symbolic_name"]),
                    description=ds_data.get("description", ""),
                    category="datastore",
                    data_store_type=ds_data.get("type", ""),
                    trust_zone=trust_zone,
                    threat_model=threat_model,
                    format_metadata={
                        "tm_library": {
                            "symbolic_name": ds_data["symbolic_name"],
                            "vendor": ds_data.get("vendor", ""),
                            "product": ds_data.get("product", ""),
                        }
                    },
                )
                resolver.register("data_store", ds_data["symbolic_name"], comp)
                summary["data_stores"] += 1

            # 7. Data Assets (data_sets) + ComponentDataAsset joins
            for da_data in json_data.get("data_sets", []):
                data_asset = DataAsset.objects.create(
                    threat_model=threat_model,
                    name=da_data.get("title", da_data["symbolic_name"]),
                    description=da_data.get("description", ""),
                    classification=",".join(da_data.get("data_sensitivity", [])) or "general",
                    data_sensitivity=da_data.get("data_sensitivity", []),
                    format_metadata={
                        "tm_library": {
                            "symbolic_name": da_data["symbolic_name"],
                            "record_count": da_data.get("record_count"),
                            "access_control_methods": da_data.get("access_control_methods", []),
                        }
                    },
                )
                resolver.register("data_asset", da_data["symbolic_name"], data_asset)
                summary["data_assets"] += 1

                # Create placements
                for placement in da_data.get("placements", []):
                    store_name = placement.get("data_store", "")
                    store_comp = resolver.resolve("data_store", store_name)
                    if store_comp:
                        ComponentDataAsset.objects.create(
                            component=store_comp,
                            data_asset=data_asset,
                            encrypted=placement.get("encrypted", False),
                        )

            # 8. Data Flows
            for df_data in json_data.get("data_flows", []):
                source = _resolve_flow_endpoint(resolver, df_data.get("source", {}))
                destination = _resolve_flow_endpoint(resolver, df_data.get("destination", {}))

                if source and destination:
                    flow = DataFlow.objects.create(
                        source_component=source,
                        dest_component=destination,
                        label=df_data.get("title", df_data.get("symbolic_name", "")),
                        description=df_data.get("description", ""),
                        encrypted=df_data.get("encrypted", False),
                        has_sensitive_data=df_data.get("has_sensitive_data", False),
                        format_metadata={
                            "tm_library": {
                                "symbolic_name": df_data["symbolic_name"],
                            }
                        },
                    )
                    resolver.register("data_flow", df_data["symbolic_name"], flow)
                    summary["data_flows"] += 1
                else:
                    summary["warnings"].append(
                        f"Data flow '{df_data.get('symbolic_name')}' skipped: "
                        f"could not resolve source or destination"
                    )

            # 9. Threat Personas → store in format_metadata
            threat_personas = json_data.get("threat_personas", [])
            if threat_personas:
                fm = threat_model.format_metadata
                fm.setdefault("tm_library", {})["threat_personas"] = threat_personas
                threat_model.save(update_fields=["format_metadata"])

            # 10. Assumptions
            raw_assumptions = json_data.get("assumptions", [])
            if raw_assumptions:
                assumptions = []
                for idx, assumption in enumerate(raw_assumptions):
                    if not isinstance(assumption, dict):
                        summary["warnings"].append(f"assumptions[{idx}]: not an object, skipped.")
                        continue
                    assumptions.append({
                        "id": assumption.get("id", f"assumption-{idx}"),
                        "description": assumption.get("description", ""),
                        "validity": assumption.get("validity", "unconfirmed"),
                        "topics": assumption.get("topics", []),
                    })
                threat_model.assumptions = assumptions
                threat_model.save(update_fields=["assumptions"])

            # 11. Threats
            threat_component_map = {}  # symbolic_name → list of threat instances
            system_component = None  # Lazy-created for threats without components_affected
            for threat_data in json_data.get("threats", []):
                symbolic_name = threat_data["symbolic_name"]
                title = threat_data.get("title", symbolic_name)
                description = threat_data.get("description", "")

                # Skip duplicate threats (same symbolic name already imported)
                if symbolic_name in threat_component_map:
                    summary["warnings"].append(
                        f"Duplicate threat '{symbolic_name}' skipped"
                    )
                    continue

                # Create a ThreatLibrary entry for each imported threat
                slug = symbolic_name[:100]
                # Ensure slug uniqueness by appending suffix if needed
                base_slug = slug
                counter = 1
                while ThreatLibrary.objects.filter(qualified_slug=f"custom/{slug}").exists():
                    slug = f"{base_slug[:95]}-{counter}"
                    counter += 1
                threat_lib = ThreatLibrary.objects.create(
                    name=title,
                    description=description,
                    slug=slug,
                )

                # Find which components this threat affects
                components_affected = threat_data.get("components_affected", [])
                if not components_affected:
                    # Default: create as component threat on the threat model
                    # (no specific component targeted)
                    components_affected = []

                severity_metadata = {
                    "rationale": "severity defaulted during TM-Library import",
                }

                format_meta = {
                    "tm_library": {
                        "symbolic_name": symbolic_name,
                        "threat_persona": threat_data.get("threat_persona", ""),
                        "event": threat_data.get("event", ""),
                        "sources": threat_data.get("sources", []),
                        "attack_mechanisms": threat_data.get("attack_mechanisms", {}),
                        "weaknesses": threat_data.get("weaknesses", []),
                    }
                }

                # Also check for data_flows_affected
                data_flows_affected = threat_data.get("data_flows_affected", [])

                instances = []

                # Create ComponentInstanceThreat for each component affected
                if components_affected:
                    for comp_ref in components_affected:
                        # Resolve against component types only (not trust zones)
                        comp = (
                            resolver.resolve("component", comp_ref)
                            or resolver.resolve("actor", comp_ref)
                            or resolver.resolve("data_store", comp_ref)
                        )
                        if comp:
                            instance = ComponentInstanceThreat.objects.create(
                                component=comp,
                                threat_library=threat_lib,
                                threat_name=title,
                                threat_description=description,
                                inherent_severity="medium",
                                status="exposed",
                                severity_scoring_metadata=severity_metadata,
                                format_metadata=format_meta,
                            )
                            instances.append(("component", instance))
                            summary["threats"] += 1

                # Create DataFlowInstanceThreat for each flow affected
                if data_flows_affected:
                    for flow_ref in data_flows_affected:
                        flow = resolver.resolve("data_flow", flow_ref)
                        if flow:
                            instance = DataFlowInstanceThreat.objects.create(
                                data_flow=flow,
                                threat_library=threat_lib,
                                threat_name=title,
                                threat_description=description,
                                inherent_severity="medium",
                                status="exposed",
                                severity_scoring_metadata=severity_metadata,
                                format_metadata=format_meta,
                            )
                            instances.append(("flow", instance))
                            summary["threats"] += 1

                # If neither components nor flows affected, create system-level
                if not components_affected and not data_flows_affected:
                    if system_component is None:
                        system_component = OrgsystemComponent.objects.create(
                            name=f"{threat_model.name} (System)",
                            category="process",
                            threat_model=threat_model,
                            format_metadata={"tm_library": {"synthetic": True}},
                        )
                    instance = ComponentInstanceThreat.objects.create(
                        component=system_component,
                        threat_library=threat_lib,
                        threat_name=title,
                        threat_description=description,
                        inherent_severity="medium",
                        status="exposed",
                        severity_scoring_metadata=severity_metadata,
                        format_metadata=format_meta,
                    )
                    instances.append(("component", instance))
                    summary["threats"] += 1

                threat_component_map[symbolic_name] = instances
                resolver.register("threat", symbolic_name, threat_lib)

            # 11. Controls → Countermeasures (duplicate per referenced threat)
            for ctrl_data in json_data.get("controls", []):
                symbolic_name = ctrl_data["symbolic_name"]
                title = ctrl_data.get("title", symbolic_name)
                description = ctrl_data.get("description", "")
                original_status = ctrl_data.get("status", "unknown")
                mapped_status = CONTROL_STATUS_MAP.get(original_status, "gap")
                priority = CONTROL_PRIORITY_MAP.get(ctrl_data.get("priority", ""), "none")

                # Create a CountermeasureLibrary entry
                cm_lib = CountermeasureLibrary.objects.create(
                    name=title,
                    description=description,
                    default_status=mapped_status,
                )

                referenced_threats = ctrl_data.get("threats", [])
                for threat_ref in referenced_threats:
                    instances = threat_component_map.get(threat_ref, [])
                    for threat_type, threat_instance in instances:
                        if threat_type == "component":
                            ComponentInstanceCountermeasure.objects.create(
                                instance_threat=threat_instance,
                                countermeasure_library=cm_lib,
                                countermeasure_name=title,
                                countermeasure_description=description,
                                status=mapped_status,
                                priority=priority,
                                format_metadata={
                                    "tm_library": {
                                        "symbolic_name": symbolic_name,
                                        "original_status": original_status,
                                    }
                                },
                            )
                        elif threat_type == "flow":
                            FlowInstanceCountermeasure.objects.create(
                                flow_threat=threat_instance,
                                countermeasure_library=cm_lib,
                                countermeasure_name=title,
                                countermeasure_description=description,
                                status=mapped_status,
                                priority=priority,
                                format_metadata={
                                    "tm_library": {
                                        "symbolic_name": symbolic_name,
                                        "original_status": original_status,
                                    }
                                },
                            )
                        summary["controls"] += 1

                resolver.register("control", symbolic_name, cm_lib)

            # 12. Risks
            for risk_data in json_data.get("risks", []):
                scoring_metadata = {
                    "likelihood": risk_data.get("likelihood", "possible"),
                    "impact": risk_data.get("impact", "moderate"),
                    "impact_description": risk_data.get("impact_description", ""),
                }

                try:
                    score, level = calculate_inherent_score("tm_library", scoring_metadata)
                except Exception:
                    # Fallback: use file score if engine fails
                    score = min(100, max(0, int(risk_data.get("score", 50)) * 4))
                    level = risk_data.get("level", "medium")

                risk = Risk.objects.create(
                    threat_model=threat_model,
                    name=risk_data.get("title", risk_data.get("symbolic_name", "")),
                    description=risk_data.get("description", ""),
                    scoring_metadata=scoring_metadata,
                    inherent_score=score,
                    inherent_level=level,
                    format_metadata={
                        "tm_library": {
                            "symbolic_name": risk_data.get("symbolic_name", ""),
                            "original_score": risk_data.get("score"),
                            "original_level": risk_data.get("level"),
                        }
                    },
                )

                # Create RiskThreat rows
                for threat_ref in risk_data.get("threats", []):
                    instances = threat_component_map.get(threat_ref, [])
                    for threat_type, threat_instance in instances:
                        if threat_type == "component":
                            RiskThreat.objects.create(
                                risk=risk,
                                component_threat=threat_instance,
                            )
                        elif threat_type == "flow":
                            RiskThreat.objects.create(
                                risk=risk,
                                flow_threat=threat_instance,
                            )

                recalculate_risk(risk)
                summary["risks"] += 1

        return threat_model, summary

    def export_data(self, threat_model):
        from apps.systems.models import (
            ComponentDataAsset,
            DataAsset,
            DataFlow,
            OrgsystemComponent,
            TrustBoundary,
            TrustZone,
        )
        from apps.threats.models import (
            ComponentInstanceCountermeasure,
            ComponentInstanceThreat,
            DataFlowInstanceThreat,
            FlowInstanceCountermeasure,
            Risk,
        )

        result = {
            "version": "1.0",
            "scope": {},
            "trust_zones": [],
            "trust_boundaries": [],
            "actors": [],
            "components": [],
            "data_stores": [],
            "data_sets": [],
            "data_flows": [],
            "threats": [],
            "controls": [],
            "risks": [],
        }

        # Build symbolic name resolver from stored format_metadata
        resolver = SymbolicNameResolver()

        def _get_symbolic_name(obj, entity_type):
            """Get symbolic name from format_metadata or generate one."""
            fm = getattr(obj, "format_metadata", {}) or {}
            tm_lib = fm.get("tm_library", {})
            if tm_lib.get("symbolic_name"):
                return tm_lib["symbolic_name"]
            return f"{entity_type}_{obj.pk}"

        # Scope
        fm = threat_model.format_metadata or {}
        tm_lib_meta = fm.get("tm_library", {})
        stored_scope = tm_lib_meta.get("scope", {})
        result["scope"] = {
            "title": threat_model.name,
            "description": threat_model.description,
            "business_criticality": BUSINESS_CRITICALITY_REVERSE.get(
                threat_model.criticality, "moderate"
            ),
            **{k: v for k, v in stored_scope.items() if k not in ("title", "description", "business_criticality")},
        }
        if tm_lib_meta.get("version"):
            result["version"] = tm_lib_meta["version"]
        if tm_lib_meta.get("release_docs_link"):
            result["release_docs_link"] = tm_lib_meta["release_docs_link"]
        if tm_lib_meta.get("repo_link"):
            result["repo_link"] = tm_lib_meta["repo_link"]

        # Assumptions
        if threat_model.assumptions:
            result["assumptions"] = threat_model.assumptions

        # Collect all components for this threat model
        components = OrgsystemComponent.objects.filter(threat_model=threat_model)

        # Trust Zones — use stored zone IDs if available, else gather from components
        stored_zone_ids = tm_lib_meta.get("zone_ids", [])
        if stored_zone_ids:
            zone_ids = set(stored_zone_ids)
        else:
            zone_ids = set(
                components.exclude(trust_zone__isnull=True).values_list("trust_zone_id", flat=True)
            )
        trust_zones = TrustZone.objects.filter(id__in=zone_ids)
        for tz in trust_zones:
            sym = _get_symbolic_name(tz, "zone")
            resolver.register("trust_zone", sym, tz)
            result["trust_zones"].append({
                "symbolic_name": sym,
                "title": tz.name,
                "description": tz.description,
            })

        # Trust Boundaries
        boundaries = TrustBoundary.objects.filter(
            zone_a__in=trust_zones
        ) | TrustBoundary.objects.filter(
            zone_b__in=trust_zones
        )
        for tb in boundaries.distinct():
            zone_a_sym = _get_symbolic_name(tb.zone_a, "zone")
            zone_b_sym = _get_symbolic_name(tb.zone_b, "zone")
            tb_fm = (tb.format_metadata or {}).get("tm_library", {})
            result["trust_boundaries"].append({
                "trust_zone_a": zone_a_sym,
                "trust_zone_b": zone_b_sym,
                "access_control_methods": tb_fm.get("access_control_methods", []),
                "authentication_methods": tb_fm.get("authentication_methods", []),
            })

        # Components by category (skip synthetic system component)
        for comp in components:
            comp_fm = (comp.format_metadata or {}).get("tm_library", {})
            if comp_fm.get("synthetic"):
                continue

            sym = _get_symbolic_name(comp, comp.category or "component")
            resolver.register(comp.category or "component", sym, comp)

            trust_zone_sym = ""
            if comp.trust_zone:
                trust_zone_sym = _get_symbolic_name(comp.trust_zone, "zone")

            if comp.category in ("human_actor", "system_actor"):
                original_type = comp_fm.get("original_type") or CATEGORY_TO_ACTOR_TYPE.get(comp.category, "user")
                result["actors"].append({
                    "symbolic_name": sym,
                    "title": comp.name,
                    "description": comp.description,
                    "type": original_type,
                    "permissions": comp_fm.get("permissions", ""),
                })
                # Also register as "actor" for flow resolution
                resolver.register("actor", sym, comp)
            elif comp.category == "datastore":
                result["data_stores"].append({
                    "symbolic_name": sym,
                    "title": comp.name,
                    "description": comp.description,
                    "type": comp.data_store_type or "",
                    "vendor": comp_fm.get("vendor", ""),
                    "product": comp_fm.get("product", ""),
                })
                resolver.register("data_store", sym, comp)
            else:
                entry = {
                    "symbolic_name": sym,
                    "title": comp.name,
                    "description": comp.description,
                    "trust_zone": trust_zone_sym,
                }
                if comp_fm.get("repo_link"):
                    entry["repo_link"] = comp_fm["repo_link"]
                if comp.parent_component:
                    parent_sym = _get_symbolic_name(comp.parent_component, "component")
                    entry["parent_component"] = parent_sym
                result["components"].append(entry)
                resolver.register("component", sym, comp)

        # Data Assets
        data_assets = DataAsset.objects.filter(threat_model=threat_model)
        for da in data_assets:
            da_sym = _get_symbolic_name(da, "data_asset")
            da_fm = (da.format_metadata or {}).get("tm_library", {})

            placements = []
            for cda in ComponentDataAsset.objects.filter(data_asset=da).select_related("component"):
                store_sym = _get_symbolic_name(cda.component, "data_store")
                placements.append({
                    "data_store": store_sym,
                    "encrypted": cda.encrypted,
                })

            result["data_sets"].append({
                "symbolic_name": da_sym,
                "title": da.name,
                "description": da.description,
                "placements": placements,
                "record_count": da_fm.get("record_count"),
                "data_sensitivity": da.data_sensitivity or [],
                "access_control_methods": da_fm.get("access_control_methods", []),
            })

        # Data Flows
        comp_reverse = {}
        for entity_type in ("actor", "component", "data_store"):
            for sym, obj in resolver.get_all(entity_type).items():
                comp_reverse[obj.pk] = (entity_type, sym)

        flows = DataFlow.objects.filter(
            source_component__in=components
        ) | DataFlow.objects.filter(
            dest_component__in=components
        )
        for flow in flows.distinct():
            flow_sym = _get_symbolic_name(flow, "flow")
            source_type, source_sym = comp_reverse.get(flow.source_component_id, ("component", f"component_{flow.source_component_id}"))
            dest_type, dest_sym = comp_reverse.get(flow.dest_component_id, ("component", f"component_{flow.dest_component_id}"))

            result["data_flows"].append({
                "symbolic_name": flow_sym,
                "title": flow.label,
                "description": flow.description,
                "source": {"type": source_type, "name": source_sym},
                "destination": {"type": dest_type, "name": dest_sym},
                "has_sensitive_data": flow.has_sensitive_data,
                "encrypted": flow.encrypted,
            })

        # Threat Personas (stored in format_metadata)
        threat_personas = tm_lib_meta.get("threat_personas", [])
        if threat_personas:
            result["threat_personas"] = threat_personas

        # Threats — collect from component and flow threats, grouped by library
        component_threat_ids = set(components.values_list("id", flat=True))
        comp_threats = ComponentInstanceThreat.objects.filter(
            component_id__in=component_threat_ids
        ).select_related("threat_library").prefetch_related("countermeasures")

        flow_ids = set(DataFlow.objects.filter(
            source_component__in=components
        ).values_list("id", flat=True)) | set(DataFlow.objects.filter(
            dest_component__in=components
        ).values_list("id", flat=True))
        flow_threats = DataFlowInstanceThreat.objects.filter(
            data_flow_id__in=flow_ids
        ).select_related("threat_library").prefetch_related("countermeasures")

        # Build flow reverse lookup for data_flows_affected
        flow_reverse = {}
        for flow_sym, flow_obj in resolver.get_all("data_flow").items():
            flow_reverse[flow_obj.pk] = flow_sym
        # Also handle flows not yet in resolver (non-imported models)
        for flow in flows.distinct():
            if flow.pk not in flow_reverse:
                flow_reverse[flow.pk] = _get_symbolic_name(flow, "flow")

        # Group threats by threat_library_id (or by name+desc for custom)
        # Each group becomes one threat entry in the export
        threat_groups = {}  # group_key → { symbolic_name, title, desc, ..., components_affected, data_flows_affected, instances }

        def _threat_group_key(threat_instance):
            """Determine grouping key for a threat instance."""
            if threat_instance.threat_library_id:
                return f"lib_{threat_instance.threat_library_id}"
            # Custom threat: group by stored symbolic name or name+desc
            fm = (threat_instance.format_metadata or {}).get("tm_library", {})
            if fm.get("symbolic_name"):
                return fm["symbolic_name"]
            return f"custom_{threat_instance.threat_name}_{hash(threat_instance.threat_description or '')}"

        for threat in comp_threats:
            group_key = _threat_group_key(threat)
            threat_fm = (threat.format_metadata or {}).get("tm_library", {})

            if group_key not in threat_groups:
                threat_sym = threat_fm.get("symbolic_name") or f"threat_{threat.pk}"
                threat_groups[group_key] = {
                    "symbolic_name": threat_sym,
                    "title": threat.threat_name or (threat.threat_library.name if threat.threat_library else ""),
                    "description": threat.threat_description or (threat.threat_library.description if threat.threat_library else ""),
                    "tm_library_fields": {
                        field: threat_fm[field]
                        for field in ("threat_persona", "event", "sources", "attack_mechanisms", "weaknesses")
                        if threat_fm.get(field)
                    },
                    "components_affected": [],
                    "data_flows_affected": [],
                    "instances": [],
                }

            comp_sym = comp_reverse.get(threat.component_id)
            if comp_sym:
                entity_sym = comp_sym[1]
                if entity_sym not in threat_groups[group_key]["components_affected"]:
                    threat_groups[group_key]["components_affected"].append(entity_sym)
            threat_groups[group_key]["instances"].append(("component", threat))

        for threat in flow_threats:
            group_key = _threat_group_key(threat)
            threat_fm = (threat.format_metadata or {}).get("tm_library", {})

            if group_key not in threat_groups:
                threat_sym = threat_fm.get("symbolic_name") or f"threat_{threat.pk}"
                threat_groups[group_key] = {
                    "symbolic_name": threat_sym,
                    "title": threat.threat_name or (threat.threat_library.name if threat.threat_library else ""),
                    "description": threat.threat_description or (threat.threat_library.description if threat.threat_library else ""),
                    "tm_library_fields": {
                        field: threat_fm[field]
                        for field in ("threat_persona", "event", "sources", "attack_mechanisms", "weaknesses")
                        if threat_fm.get(field)
                    },
                    "components_affected": [],
                    "data_flows_affected": [],
                    "instances": [],
                }

            flow_sym = flow_reverse.get(threat.data_flow_id, f"flow_{threat.data_flow_id}")
            if flow_sym not in threat_groups[group_key]["data_flows_affected"]:
                threat_groups[group_key]["data_flows_affected"].append(flow_sym)
            threat_groups[group_key]["instances"].append(("flow", threat))

        # Emit grouped threats and collect countermeasures
        control_groups = {}  # control_symbolic_name → {data, threat_symbolic_names}

        for group in threat_groups.values():
            threat_sym = group["symbolic_name"]
            threat_entry = {
                "symbolic_name": threat_sym,
                "title": group["title"],
                "description": group["description"],
            }
            if group["components_affected"]:
                threat_entry["components_affected"] = group["components_affected"]
            if group["data_flows_affected"]:
                threat_entry["data_flows_affected"] = group["data_flows_affected"]
            threat_entry.update(group["tm_library_fields"])
            result["threats"].append(threat_entry)

            # Collect countermeasures from all instances in the group
            for threat_type, threat_instance in group["instances"]:
                countermeasures = threat_instance.countermeasures.all()
                for cm in countermeasures:
                    cm_fm = (cm.format_metadata or {}).get("tm_library", {})
                    cm_sym = cm_fm.get("symbolic_name") or f"control_{cm.pk}"

                    if cm_sym not in control_groups:
                        original_status = cm_fm.get("original_status") or CONTROL_STATUS_REVERSE.get(cm.status, cm.status)
                        control_groups[cm_sym] = {
                            "data": {
                                "symbolic_name": cm_sym,
                                "title": cm.countermeasure_name or "",
                                "description": cm.countermeasure_description or "",
                                "status": original_status,
                                "priority": cm.priority or "medium",
                            },
                            "threat_symbolic_names": set(),
                        }
                    control_groups[cm_sym]["threat_symbolic_names"].add(threat_sym)

        # Re-merge controls
        for group in control_groups.values():
            ctrl = group["data"].copy()
            ctrl["threats"] = sorted(group["threat_symbolic_names"])
            result["controls"].append(ctrl)

        # Risks
        risks = Risk.objects.filter(threat_model=threat_model).prefetch_related(
            "risk_threats__component_threat", "risk_threats__flow_threat"
        )
        for risk in risks:
            risk_fm = (risk.format_metadata or {}).get("tm_library", {})
            risk_sym = risk_fm.get("symbolic_name") or f"risk_{risk.pk}"

            scoring = risk.scoring_metadata or {}
            risk_threats_syms = []
            for rt in risk.risk_threats.all():
                threat = rt.component_threat or rt.flow_threat
                if threat:
                    t_fm = (threat.format_metadata or {}).get("tm_library", {})
                    risk_threats_syms.append(t_fm.get("symbolic_name") or f"threat_{threat.pk}")

            risk_entry = {
                "symbolic_name": risk_sym,
                "title": risk.name,
                "description": risk.description,
                "threats": risk_threats_syms,
                "likelihood": scoring.get("likelihood", ""),
                "impact": scoring.get("impact", ""),
                "impact_description": scoring.get("impact_description", ""),
                "score": round(risk.inherent_score / 100 * 25),
                "level": risk.inherent_level,
            }
            result["risks"].append(risk_entry)

        return result
