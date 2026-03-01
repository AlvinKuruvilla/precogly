"""Service functions for risk computation and recalculation."""

from .models import Risk, RiskThreat
from .scoring.registry import get_scoring_methods, score_to_level

STATUS_EFFECTIVENESS_FALLBACK = {
    "verified": 1.0,
    "planned": 0.5,
    "gap": 0.0,
    "waived": 0.0,
}


def derive_risk_status(risk):
    """Aggregate status from all linked threats' statuses.

    Returns: "open" / "mitigated" / "accepted"
    """
    risk_threats = risk.risk_threats.select_related(
        "component_threat", "flow_threat"
    ).all()

    if not risk_threats.exists():
        return "open"

    all_threat_statuses = []
    for risk_threat in risk_threats:
        threat = risk_threat.component_threat or risk_threat.flow_threat
        if threat and not threat.is_dismissed:
            all_threat_statuses.append(threat.status)

    if not all_threat_statuses:
        return "open"

    if all(s == "mitigated" for s in all_threat_statuses):
        return "mitigated"
    if all(s == "accepted" for s in all_threat_statuses):
        return "accepted"
    if all(s in ["mitigated", "accepted"] for s in all_threat_statuses):
        return "mitigated"
    return "open"


def compute_residual_score(risk):
    """Compute residual score from inherent score and countermeasure effectiveness.

    Effectiveness comes from:
      1. User-entered value on the countermeasure (if set)
      2. Status-derived fallback: verified=1.0, planned=0.5, gap=0.0, waived=0.0
    """
    all_effectiveness = []
    for risk_threat in risk.risk_threats.all():
        threat = risk_threat.component_threat or risk_threat.flow_threat
        if not threat or threat.is_dismissed:
            continue
        for countermeasure in threat.countermeasures.all():
            if countermeasure.effectiveness is not None:
                all_effectiveness.append(countermeasure.effectiveness)
            else:
                all_effectiveness.append(
                    STATUS_EFFECTIVENESS_FALLBACK.get(countermeasure.status, 0.0)
                )

    if not all_effectiveness:
        return risk.inherent_score

    avg_effectiveness = sum(all_effectiveness) / len(all_effectiveness)
    return max(1, round(risk.inherent_score * (1 - avg_effectiveness)))


def calculate_inherent_score(scoring_method, scoring_metadata):
    """Delegate to the scoring engine registry to compute inherent score.

    Returns (score: int, level: str) or raises ValidationError.
    """
    methods = get_scoring_methods()
    method_config = methods.get(scoring_method)

    if not method_config:
        raise ValueError(f"Unknown scoring method: {scoring_method}")

    engine_class = method_config["engine"]
    if engine_class is None:
        # Custom method or not-yet-implemented — caller must provide score directly
        return None, None

    engine = engine_class()
    engine.validate_inputs(scoring_metadata)
    return engine.calculate(scoring_metadata)


def recalculate_risk(risk):
    """Recompute residual_score and residual_level, save to DB."""
    residual_score = compute_residual_score(risk)
    residual_level = score_to_level(residual_score) if residual_score is not None else ""

    Risk.objects.filter(pk=risk.pk).update(
        residual_score=residual_score,
        residual_level=residual_level,
    )


def recalculate_risks_for_threat(threat_instance, threat_type="component"):
    """Find all Risks linked to this threat and recalculate each."""
    if threat_type == "component":
        risk_ids = RiskThreat.objects.filter(
            component_threat=threat_instance
        ).values_list("risk_id", flat=True)
    else:
        risk_ids = RiskThreat.objects.filter(
            flow_threat=threat_instance
        ).values_list("risk_id", flat=True)

    for risk in Risk.objects.filter(id__in=risk_ids):
        recalculate_risk(risk)
