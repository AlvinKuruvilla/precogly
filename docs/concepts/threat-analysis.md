# Threat Analysis

The threat analysis view is the three-panel workspace where you review components, assess threats, and track countermeasures. Each panel answers one question: *what are we working on?*, *what can go wrong?*, and *what can we do about it?*

![Three-panel threat analysis view — components on the left, threats in the center, countermeasures on the right](../assets/images/threat-analysis-overview.png)

Select a component in the left panel to see its threats. Select a threat to see its countermeasures. Each threat shows a severity assessment (likelihood, impact, rationale) and a status badge — exposed, addressable, or mitigated.

Threats carry taxonomy tags from your imported library packs — STRIDE categories, CAPEC attack patterns, CWE weaknesses, and MITRE ATT&CK techniques — so you can trace each threat back to established frameworks.

![Threats with STRIDE, CAPEC, CWE, and MITRE ATT&CK taxonomy tags](../assets/images/threat-analysis-taxonomy-links.png)

Each countermeasure moves through a lifecycle: **Platform** (provided by infrastructure), **Gap** (not yet addressed), **Planned** (assigned to an owner), **Verified** (confirmed in place), or **Waived** (accepted risk).

![Countermeasure status lifecycle — Platform, Gap, Planned, Verified, Waived](../assets/images/threat-analysis-countermeasures-states.png)

Assign a team member as owner to move a countermeasure from Gap to Planned. Set priority and track progress across your team.

![Assigning a team member as countermeasure owner](../assets/images/threat-analysis-countermeasure-assignment.png)

Countermeasures can be mapped to compliance framework requirements. Expand the compliance coverage section to see which standards a countermeasure satisfies and whether coverage is full or partial.

![Compliance mappings on a countermeasure — OWASP ASVS and CRA requirements with sufficiency indicators](../assets/images/threat-analysis-compliance-mappings.png)
