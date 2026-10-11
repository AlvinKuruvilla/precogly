"""Use cases: ``definitions.useCases[]`` from ``UseCase`` rows.

``flow_data`` is JSON written by import, so every entry is checked against
what the schema requires before it is emitted; steps use ``number``, never
``ordinal`` (#584 section 1). The use case's own lists are ``uniqueItems``,
so repeated entries are written once (an alternative flow's ``steps`` is not).
"""

from ..passthrough import collect_refs
from ..refs import RefRegistry

LIST_KEYS = (
    ("preconditions", "preconditions"),
    ("postconditions", "postconditions"),
    ("success_criteria", "successCriteria"),
    ("notes", "notes"),
)


def _unique(items: list) -> list:
    """``items`` with repeats removed, first occurrence kept."""
    unique_items = []
    for item in items:
        if item not in unique_items:
            unique_items.append(item)
    return unique_items


def _steps(raw) -> list[dict]:
    if not isinstance(raw, list):
        return []
    steps = []
    for index, step in enumerate(raw, start=1):
        if isinstance(step, str):
            if step:
                steps.append({"number": index, "description": step})
            continue
        if not isinstance(step, dict):
            continue
        description = step.get("description")
        if not isinstance(description, str) or not description:
            continue
        number = step.get("number", step.get("ordinal", index))
        try:
            number = int(number)
        except (TypeError, ValueError):
            number = index
        if number < 1:
            number = index
        entry = {"number": number, "description": description}
        if isinstance(step.get("actor"), str) and step["actor"]:
            entry["actor"] = step["actor"]
        steps.append(entry)
    return steps


def _named_entry(item) -> dict | None:
    """``name``, ``condition`` and ``description`` of a flow or an exception."""
    if not isinstance(item, dict):
        return None
    name = item.get("name")
    condition = item.get("condition")
    if not isinstance(name, str) or not name:
        return None
    if not isinstance(condition, str) or not condition:
        return None
    entry = {"name": name, "condition": condition}
    if isinstance(item.get("description"), str) and item["description"]:
        entry["description"] = item["description"]
    return entry


def _alternative_flows(raw) -> list[dict]:
    flows = []
    for item in raw if isinstance(raw, list) else []:
        entry = _named_entry(item)
        if entry is None:
            continue
        steps = _steps(item.get("steps"))
        if steps:
            entry["steps"] = steps
        flows.append(entry)
    return _unique(flows)


def _exceptions(raw) -> list[dict]:
    """Exceptions; ``handling`` is a single string in the schema, not steps."""
    exceptions = []
    for item in raw if isinstance(raw, list) else []:
        entry = _named_entry(item)
        if entry is None:
            continue
        handling = item.get("handling")
        if isinstance(handling, str) and handling:
            entry["handling"] = handling
        exceptions.append(entry)
    return _unique(exceptions)


def export_use_case(use_case, refs: RefRegistry) -> dict:
    entry = {"bom-ref": refs.ref("usecase", use_case), "name": use_case.name}
    if use_case.description:
        entry["description"] = use_case.description
    flow_data = use_case.flow_data or {}
    for ours, theirs in LIST_KEYS:
        raw = flow_data.get(ours)
        values = _unique(
            [v for v in raw if isinstance(v, str) and v]
            if isinstance(raw, list)
            else []
        )
        if values:
            entry[theirs] = values
    main_flow = _unique(_steps(flow_data.get("main_flow")))
    if main_flow:
        entry["mainFlow"] = main_flow
    alternative = _alternative_flows(flow_data.get("alternative_flows"))
    if alternative:
        entry["alternativeFlows"] = alternative
    exceptions = _exceptions(flow_data.get("exceptions"))
    if exceptions:
        entry["exceptions"] = exceptions
    return entry


def export_use_cases(threat_model, refs: RefRegistry) -> list[dict]:
    use_cases = list(threat_model.use_cases.order_by("id"))
    refs.reserve_stored(use_cases)
    return [export_use_case(use_case, refs) for use_case in use_cases]


def drop_unresolved_step_actors(document: dict, warnings: list) -> None:
    """Leave out step actors whose ref is no longer in ``document``.

    A step ``actor`` is written back as imported; the actor it names can be
    deleted since (for example the component an imported actor became). Run
    once the whole document is built, so every ref it holds is known.
    """
    known_refs = collect_refs(document)
    for use_case in (document.get("definitions") or {}).get("useCases") or []:
        flows = [use_case.get("mainFlow") or []]
        for alternative in use_case.get("alternativeFlows") or []:
            flows.append(alternative.get("steps") or [])
        for steps in flows:
            for step in steps:
                actor = step.get("actor")
                if actor is None or actor in known_refs:
                    continue
                if actor.startswith("urn:cdx:"):
                    continue
                del step["actor"]
                warnings.append(
                    f"Use case '{use_case['name']}', step {step['number']}: "
                    f"dropped actor '{actor}'; it no longer resolves."
                )
