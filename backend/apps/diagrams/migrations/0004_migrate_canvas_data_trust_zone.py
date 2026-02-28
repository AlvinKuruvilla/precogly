"""
Migrate canvas_data JSON blobs from TrustBoundary → TrustZone naming.

Walks all DFD.canvas_data and DFDTemplatesLibrary.canvas_data JSON blobs:
- Node type: "trustBoundary" → "trustZone"
- Node data key: "boundaryType" → "zoneType"
- Edge data keys: crossesBoundaryId/Label/Type/Ids → crossesZoneId/Label/Type/Ids
"""

from django.db import migrations


def migrate_canvas_data_forward(apps, schema_editor):
    """Rename trustBoundary → trustZone in all canvas_data JSON."""
    DFD = apps.get_model("diagrams", "DFD")
    DFDTemplatesLibrary = apps.get_model("diagrams", "DFDTemplatesLibrary")

    for model_class in [DFD, DFDTemplatesLibrary]:
        for instance in model_class.objects.all():
            canvas_data = instance.canvas_data
            if not canvas_data:
                continue

            changed = False

            # Migrate nodes
            for node in canvas_data.get("nodes", []):
                if node.get("type") == "trustBoundary":
                    node["type"] = "trustZone"
                    changed = True

                node_data = node.get("data", {})
                if "boundaryType" in node_data:
                    node_data["zoneType"] = node_data.pop("boundaryType")
                    changed = True

            # Migrate edges
            for edge in canvas_data.get("edges", []):
                edge_data = edge.get("data", {})

                renames = {
                    "crossesBoundaryId": "crossesZoneId",
                    "crossesBoundaryLabel": "crossesZoneLabel",
                    "crossesBoundaryType": "crossesZoneType",
                    "crossesBoundaryIds": "crossesZoneIds",
                }
                for old_key, new_key in renames.items():
                    if old_key in edge_data:
                        edge_data[new_key] = edge_data.pop(old_key)
                        changed = True

            if changed:
                instance.canvas_data = canvas_data
                instance.save(update_fields=["canvas_data"])


class Migration(migrations.Migration):

    dependencies = [
        ("diagrams", "0003_threatmodel_modeling_mode_threatmodelreferenceimage"),
    ]

    operations = [
        migrations.RunPython(
            migrate_canvas_data_forward,
            migrations.RunPython.noop,  # No production data, reverse is noop
        ),
    ]
