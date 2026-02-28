"""
Threat and countermeasure registry for computing threat model statistics.

This module mirrors the frontend threat-registry.ts and countermeasure-registry.ts
to enable server-side computation of threat/countermeasure counts for shared views.
"""

from typing import Dict, List, Optional, Set

# Technology categories that threats can apply to
TECHNOLOGY_CATEGORIES = [
    "database",
    "backend",
    "frontend",
    "infrastructure",
    "messaging",
    "cache",
    "storage",
    "auth",
    "monitoring",
    "compute",
    "networking",
    "security",
    "other",
]

# Maps technology IDs to their categories
TECHNOLOGY_TO_CATEGORY: Dict[str, str] = {
    # Databases
    "aws-rds-postgresql": "database",
    "aws-rds-mysql": "database",
    "aws-aurora": "database",
    "aws-dynamodb": "database",
    "azure-sql": "database",
    "azure-cosmosdb": "database",
    "gcp-cloudsql-postgresql": "database",
    "gcp-firestore": "database",
    "postgresql": "database",
    "mysql": "database",
    "mongodb": "database",
    "redis": "database",
    "elasticsearch": "database",
    # Storage
    "aws-s3": "storage",
    "azure-blob": "storage",
    "gcp-storage": "storage",
    # Cache
    "aws-elasticache-redis": "cache",
    "azure-cache-redis": "cache",
    "redis-generic": "cache",
    "memcached": "cache",
    # Compute
    "aws-lambda": "compute",
    "aws-ecs": "compute",
    "aws-eks": "compute",
    "azure-functions": "compute",
    "azure-aks": "compute",
    "gcp-functions": "compute",
    "gcp-run": "compute",
    "kubernetes": "compute",
    # Backend
    "nodejs": "backend",
    "python": "backend",
    "java": "backend",
    "dotnet": "backend",
    "go": "backend",
    "springboot": "backend",
    "django": "backend",
    "fastapi": "backend",
    "express": "backend",
    # Messaging
    "aws-sqs": "messaging",
    "aws-sns": "messaging",
    "aws-kinesis": "messaging",
    "azure-servicebus": "messaging",
    "gcp-pubsub": "messaging",
    "kafka": "messaging",
    "rabbitmq": "messaging",
    # Auth
    "aws-cognito": "auth",
    "aws-iam": "auth",
    "azure-ad": "auth",
    "auth0": "auth",
    "okta": "auth",
    "keycloak": "auth",
    # Security
    "aws-waf": "security",
    "azure-waf": "security",
    "aws-api-gateway": "security",
    "azure-api-mgmt": "security",
    "aws-shield": "security",
    "azure-ddos": "security",
    # Networking
    "aws-vpc": "networking",
    "azure-vnet": "networking",
    "gcp-vpc": "networking",
    "nginx": "networking",
    "cloudflare": "networking",
}

# Simplified threat definitions - mapping category to threat count
# This mirrors THREAT_DEFINITIONS from the frontend
THREATS_BY_CATEGORY: Dict[str, List[str]] = {
    "database": [
        "threat-sql-injection",
        "threat-data-tampering",
        "threat-action-repudiation",
        "threat-insufficient-logging",
        "threat-data-leak",
        "threat-backup-exposure",
        "threat-resource-exhaustion",
        "threat-database-dos",
        "threat-storage-exhaustion",
        "threat-broken-access-control",
    ],
    "backend": [
        "threat-identity-spoofing",
        "threat-session-hijacking",
        "threat-credential-theft",
        "threat-api-key-compromise",
        "threat-sql-injection",
        "threat-code-injection",
        "threat-parameter-manipulation",
        "threat-action-repudiation",
        "threat-insufficient-logging",
        "threat-data-leak",
        "threat-error-disclosure",
        "threat-metadata-leakage",
        "threat-ddos",
        "threat-privilege-escalation",
        "threat-broken-access-control",
        "threat-insecure-deserialization",
    ],
    "frontend": [
        "threat-session-hijacking",
        "threat-code-injection",
        "threat-error-disclosure",
    ],
    "auth": [
        "threat-identity-spoofing",
        "threat-session-hijacking",
        "threat-credential-theft",
        "threat-privilege-escalation",
        "threat-iam-misconfiguration",
    ],
    "storage": [
        "threat-data-tampering",
        "threat-log-tampering",
        "threat-data-leak",
        "threat-backup-exposure",
        "threat-storage-exhaustion",
        "threat-broken-access-control",
    ],
    "cache": [
        "threat-cache-poisoning",
        "threat-resource-exhaustion",
    ],
    "messaging": [
        "threat-data-tampering",
        "threat-message-tampering",
        "threat-network-sniffing",
        "threat-queue-flooding",
        "threat-insecure-deserialization",
    ],
    "compute": [
        "threat-ddos",
        "threat-resource-exhaustion",
        "threat-privilege-escalation",
        "threat-container-escape",
    ],
    "networking": [
        "threat-identity-spoofing",
        "threat-api-key-compromise",
        "threat-certificate-spoofing",
        "threat-parameter-manipulation",
        "threat-network-sniffing",
        "threat-metadata-leakage",
        "threat-ddos",
    ],
    "infrastructure": [
        "threat-certificate-spoofing",
        "threat-config-tampering",
        "threat-container-escape",
        "threat-iam-misconfiguration",
    ],
    "monitoring": [
        "threat-action-repudiation",
        "threat-log-tampering",
        "threat-insufficient-logging",
    ],
    "security": [
        "threat-sec-misconfiguration",
        "threat-sec-bypass",
        "threat-sec-default-creds",
        "threat-sec-unpatched",
        "threat-sec-missing-logging",
        "threat-sec-overly-permissive",
    ],
}

# Data flow threats (apply to edges)
DATA_FLOW_THREATS = [
    "threat-df-dos",
    "threat-df-traffic-analysis",
    "threat-df-replay",
]

# Additional data flow threats for unencrypted flows
DATA_FLOW_THREATS_UNENCRYPTED = [
    "threat-df-plaintext-credentials",
    "threat-df-session-hijacking",
    "threat-df-eavesdropping",
    "threat-df-mitm",
]

# Additional data flow threats for unauthenticated flows
DATA_FLOW_THREATS_UNAUTHENTICATED = [
    "threat-df-unauthorized-access",
    "threat-df-data-injection",
]

# Trust zone threats
TRUST_ZONE_THREATS = [
    "threat-tb-zone-undefined",
    "threat-tb-zone-lateral",
]

# Countermeasures per threat (simplified count)
COUNTERMEASURES_PER_THREAT: Dict[str, int] = {
    "threat-identity-spoofing": 3,  # strong-auth, session-management, authorization
    "threat-session-hijacking": 2,
    "threat-credential-theft": 2,
    "threat-api-key-compromise": 1,
    "threat-certificate-spoofing": 1,
    "threat-sql-injection": 2,  # input-validation, parameterized-queries
    "threat-data-tampering": 1,
    "threat-message-tampering": 1,
    "threat-config-tampering": 2,
    "threat-code-injection": 1,
    "threat-parameter-manipulation": 1,
    "threat-action-repudiation": 2,
    "threat-log-tampering": 2,
    "threat-insufficient-logging": 1,
    "threat-data-leak": 3,
    "threat-network-sniffing": 1,
    "threat-error-disclosure": 1,
    "threat-cache-poisoning": 1,
    "threat-backup-exposure": 1,
    "threat-metadata-leakage": 1,
    "threat-ddos": 2,
    "threat-resource-exhaustion": 2,
    "threat-queue-flooding": 1,
    "threat-database-dos": 2,
    "threat-storage-exhaustion": 1,
    "threat-privilege-escalation": 2,
    "threat-broken-access-control": 2,
    "threat-insecure-deserialization": 1,
    "threat-container-escape": 1,
    "threat-iam-misconfiguration": 2,
    # Security control threats
    "threat-sec-misconfiguration": 2,
    "threat-sec-bypass": 1,
    "threat-sec-default-creds": 1,
    "threat-sec-unpatched": 1,
    "threat-sec-missing-logging": 1,
    "threat-sec-overly-permissive": 1,
    # Data flow threats
    "threat-df-dos": 1,
    "threat-df-traffic-analysis": 1,
    "threat-df-replay": 1,
    "threat-df-plaintext-credentials": 1,
    "threat-df-session-hijacking": 1,
    "threat-df-eavesdropping": 1,
    "threat-df-mitm": 2,
    "threat-df-unauthorized-access": 1,
    "threat-df-data-injection": 1,
    # Trust boundary threats
    "threat-tb-zone-undefined": 1,
    "threat-tb-zone-lateral": 1,
}


def infer_technology_category(
    node_type: str, tech_value: Optional[str]
) -> Optional[str]:
    """
    Infer technology category from node type and technology string.
    Mirrors frontend inferTechnologyCategory function.
    """
    if tech_value:
        # Try direct lookup
        if tech_value in TECHNOLOGY_TO_CATEGORY:
            return TECHNOLOGY_TO_CATEGORY[tech_value]

        # Try fuzzy matching
        lower = tech_value.lower()
        if "database" in lower or "sql" in lower or "db" in lower:
            return "database"
        if "redis" in lower or "cache" in lower:
            return "cache"
        if "s3" in lower or "blob" in lower or "storage" in lower:
            return "storage"
        if "lambda" in lower or "function" in lower:
            return "compute"
        if "kubernetes" in lower or "k8s" in lower:
            return "compute"
        if "api" in lower or "gateway" in lower:
            return "networking"
        if "auth" in lower or "oauth" in lower:
            return "auth"
        if "kafka" in lower or "queue" in lower:
            return "messaging"

    # Default based on node type
    if node_type == "datastore":
        return "database"
    if node_type == "process":
        return "backend"

    return None


def compute_threats_for_node(
    node_type: str, tech_value: Optional[str]
) -> List[str]:
    """
    Get applicable threats for a component node.
    """
    if node_type not in ("process", "datastore"):
        return []

    category = infer_technology_category(node_type, tech_value)
    if not category:
        return []

    return THREATS_BY_CATEGORY.get(category, [])


def compute_threats_for_trust_zone(zone_type: Optional[str]) -> List[str]:
    """
    Get applicable threats for a trust zone node.
    """
    if not zone_type:
        return []

    # Zone-type nodes have lateral movement threats
    if zone_type.startswith("zone"):
        return TRUST_ZONE_THREATS
    return []


def compute_threats_for_data_flow(
    encrypted: Optional[bool], authenticated: Optional[bool]
) -> List[str]:
    """
    Get applicable threats for a data flow edge.
    """
    threats = list(DATA_FLOW_THREATS)

    # Add threats for unencrypted flows
    if encrypted is not True:
        threats.extend(DATA_FLOW_THREATS_UNENCRYPTED)

    # Add threats for unauthenticated flows
    if authenticated is not True:
        threats.extend(DATA_FLOW_THREATS_UNAUTHENTICATED)

    return threats


def compute_threat_model_stats_from_canvas(threat_model) -> dict:
    """
    Compute threat model statistics by analyzing canvas data.
    This mirrors the frontend useWorkspaceThreatAnalysis hook.
    """
    # Get all DFDs for this threat model
    dfd_associations = threat_model.dfd_associations.select_related("dfd").all()

    # Component counts
    processes = 0
    datastores = 0
    human_actors = 0
    system_actors = 0
    boundaries = 0

    # Threat and countermeasure tracking
    all_threats: Set[str] = set()
    total_countermeasures = 0

    for assoc in dfd_associations:
        dfd = assoc.dfd
        canvas_data = dfd.canvas_data or {}
        nodes = canvas_data.get("nodes", [])
        edges = canvas_data.get("edges", [])

        # Process nodes
        for node in nodes:
            node_type = node.get("type", "")
            node_data = node.get("data", {})

            if node_type == "process":
                processes += 1
                tech = node_data.get("technology")
                threats = compute_threats_for_node("process", tech)
                for threat_id in threats:
                    # Use node ID to make threat unique per component
                    unique_threat_key = f"{node.get('id')}-{threat_id}"
                    if unique_threat_key not in all_threats:
                        all_threats.add(unique_threat_key)
                        total_countermeasures += COUNTERMEASURES_PER_THREAT.get(
                            threat_id, 1
                        )

            elif node_type == "datastore":
                datastores += 1
                tech = node_data.get("technology")
                threats = compute_threats_for_node("datastore", tech)
                for threat_id in threats:
                    unique_threat_key = f"{node.get('id')}-{threat_id}"
                    if unique_threat_key not in all_threats:
                        all_threats.add(unique_threat_key)
                        total_countermeasures += COUNTERMEASURES_PER_THREAT.get(
                            threat_id, 1
                        )

            elif node_type == "humanActor":
                human_actors += 1

            elif node_type == "systemActor":
                system_actors += 1

            elif node_type == "trustZone":
                boundaries += 1
                zone_type = node_data.get("zoneType")
                threats = compute_threats_for_trust_zone(zone_type)
                for threat_id in threats:
                    unique_threat_key = f"{node.get('id')}-{threat_id}"
                    if unique_threat_key not in all_threats:
                        all_threats.add(unique_threat_key)
                        total_countermeasures += COUNTERMEASURES_PER_THREAT.get(
                            threat_id, 1
                        )

        # Process edges (data flows)
        for edge in edges:
            edge_data = edge.get("data", {})
            encrypted = edge_data.get("encrypted")
            authenticated = edge_data.get("authenticated")

            threats = compute_threats_for_data_flow(encrypted, authenticated)
            for threat_id in threats:
                unique_threat_key = f"{edge.get('id')}-{threat_id}"
                if unique_threat_key not in all_threats:
                    all_threats.add(unique_threat_key)
                    total_countermeasures += COUNTERMEASURES_PER_THREAT.get(
                        threat_id, 1
                    )

    # Compute progress checklist values
    workspace_data = threat_model.workspace_data or {}
    system_context = workspace_data.get("systemContext", {})
    assets = system_context.get("assets", [])
    progress_checklist = workspace_data.get("progressChecklist", [])

    # Check if any progress items are manually checked
    manual_progress = {
        item.get("id"): item.get("checked", False)
        for item in progress_checklist
        if item.get("id")
    }

    # Determine if there are data flows
    has_data_flows = any(
        len((assoc.dfd.canvas_data or {}).get("edges", [])) > 0
        for assoc in dfd_associations
    )

    # Total threat count
    total_threats = len(all_threats)

    # For the shared view, we assume all threats are "exposed" (no countermeasure status)
    # In the authenticated view, this would be computed from actual countermeasure statuses
    progress = {
        "assets_defined": manual_progress.get("assets_defined", len(assets) > 0),
        "components_identified": (processes + datastores) > 0,
        "trust_boundaries_identified": boundaries > 0,
        "data_flows_defined": has_data_flows,
        "owners_assigned": manual_progress.get("owners_assigned", False),
        "threats_linked_components": total_threats > 0 and (processes + datastores) > 0,
        "threats_linked_flows": total_threats > 0 and has_data_flows,
        "countermeasures_assigned": total_countermeasures > 0,
    }

    return {
        "components": {
            "total": processes + datastores + human_actors + system_actors,
            "processes": processes,
            "datastores": datastores,
            "humanActors": human_actors,
            "systemActors": system_actors,
            "boundaries": boundaries,
        },
        "threats": {
            "total": total_threats,
            # For shared view, mark all as exposed (no countermeasure status available)
            "exposed": total_threats,
            "mitigated": 0,
        },
        "countermeasures": {
            "total": total_countermeasures,
            # For shared view, mark all as gaps (no status available)
            "verified": 0,
            "gaps": total_countermeasures,
        },
        "progress": progress,
    }
