"""
Migration: Shared countermeasures M2M

Converts countermeasure-threat from FK (one-to-many) to M2M (many-to-many)
via junction tables, enabling a single countermeasure to mitigate multiple threats.

Steps:
1. Add threat_model FK (nullable) to both countermeasure models
2. Create junction tables
3. Populate threat_model from FK chain, create junction records from existing FKs
4. Make threat_model non-nullable
5. Remove old FKs, constraints, and display_order from countermeasure models
"""

import django.db.models
from django.conf import settings
from django.db import migrations, models


def populate_threat_model_and_junction_records(apps, schema_editor):
    """
    Data migration: populate the new threat_model FK from the existing
    instance_threat/flow_threat FK chain, and create junction records.
    """
    ComponentInstanceCountermeasure = apps.get_model("threats", "ComponentInstanceCountermeasure")
    FlowInstanceCountermeasure = apps.get_model("threats", "FlowInstanceCountermeasure")
    ComponentCountermeasureThreatLink = apps.get_model("threats", "ComponentCountermeasureThreatLink")
    FlowCountermeasureThreatLink = apps.get_model("threats", "FlowCountermeasureThreatLink")

    # Component countermeasures
    for cm in ComponentInstanceCountermeasure.objects.select_related(
        "instance_threat__component__threat_model",
        "instance_threat__component__orgsystem",
    ).all():
        threat = cm.instance_threat
        component = threat.component
        # Derive threat_model: prefer direct FK, fallback to orgsystem
        threat_model = getattr(component, "threat_model", None)
        if not threat_model and component.orgsystem:
            # orgsystem-based components: find the threat_model via DFDs
            from apps.threat_models.models import ThreatModel
            # Try to find any threat model that references this component
            tms = ThreatModel.objects.filter(
                dfds__canvas_data__contains=str(component.id)
            ).first()
            threat_model = tms
        if threat_model:
            cm.threat_model = threat_model
            cm.save(update_fields=["threat_model"])

        # Create junction record
        ComponentCountermeasureThreatLink.objects.get_or_create(
            countermeasure=cm,
            threat=threat,
            defaults={"display_order": cm.display_order},
        )

    # Flow countermeasures
    for cm in FlowInstanceCountermeasure.objects.select_related(
        "flow_threat__data_flow__source_component__threat_model",
        "flow_threat__data_flow__source_component__orgsystem",
    ).all():
        threat = cm.flow_threat
        data_flow = threat.data_flow
        source_component = data_flow.source_component if data_flow else None
        threat_model = None
        if source_component:
            threat_model = getattr(source_component, "threat_model", None)
            if not threat_model and source_component.orgsystem:
                from apps.threat_models.models import ThreatModel
                tms = ThreatModel.objects.filter(
                    dfds__canvas_data__contains=str(source_component.id)
                ).first()
                threat_model = tms
        if threat_model:
            cm.threat_model = threat_model
            cm.save(update_fields=["threat_model"])

        # Create junction record
        FlowCountermeasureThreatLink.objects.get_or_create(
            countermeasure=cm,
            threat=threat,
            defaults={"display_order": cm.display_order},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("threats", "0008_refactor_risk_status_to_response"),
        ("threat_models", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Add threat_model FK (nullable initially)
        migrations.AddField(
            model_name="componentinstancecountermeasure",
            name="threat_model",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="component_countermeasures",
                to="threat_models.threatmodel",
            ),
        ),
        migrations.AddField(
            model_name="flowinstancecountermeasure",
            name="threat_model",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="flow_countermeasures",
                to="threat_models.threatmodel",
            ),
        ),

        # 2. Create junction tables
        migrations.CreateModel(
            name="ComponentCountermeasureThreatLink",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("display_order", models.PositiveIntegerField(default=0)),
                ("countermeasure", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="threat_links",
                    to="threats.componentinstancecountermeasure",
                )),
                ("threat", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="countermeasure_links",
                    to="threats.componentinstancethreat",
                )),
            ],
            options={
                "ordering": ["display_order", "created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="componentcountermeasurethreatlink",
            constraint=models.UniqueConstraint(
                fields=["countermeasure", "threat"],
                name="unique_component_cm_threat_link",
            ),
        ),
        migrations.CreateModel(
            name="FlowCountermeasureThreatLink",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("display_order", models.PositiveIntegerField(default=0)),
                ("countermeasure", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="threat_links",
                    to="threats.flowinstancecountermeasure",
                )),
                ("threat", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="countermeasure_links",
                    to="threats.dataflowinstancethreat",
                )),
            ],
            options={
                "ordering": ["display_order", "created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="flowcountermeasurethreatlink",
            constraint=models.UniqueConstraint(
                fields=["countermeasure", "threat"],
                name="unique_flow_cm_threat_link",
            ),
        ),

        # 3. RunPython: populate threat_model and create junction records
        migrations.RunPython(
            populate_threat_model_and_junction_records,
            migrations.RunPython.noop,
        ),

        # 4. Remove old constraints first
        migrations.AlterUniqueTogether(
            name="componentinstancecountermeasure",
            unique_together=set(),
        ),
        migrations.AlterUniqueTogether(
            name="flowinstancecountermeasure",
            unique_together=set(),
        ),

        # 5. Remove old FKs and display_order
        migrations.RemoveField(
            model_name="componentinstancecountermeasure",
            name="instance_threat",
        ),
        migrations.RemoveField(
            model_name="componentinstancecountermeasure",
            name="display_order",
        ),
        migrations.RemoveField(
            model_name="flowinstancecountermeasure",
            name="flow_threat",
        ),
        migrations.RemoveField(
            model_name="flowinstancecountermeasure",
            name="display_order",
        ),

        # 6. Make threat_model non-nullable
        migrations.AlterField(
            model_name="componentinstancecountermeasure",
            name="threat_model",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="component_countermeasures",
                to="threat_models.threatmodel",
            ),
        ),
        migrations.AlterField(
            model_name="flowinstancecountermeasure",
            name="threat_model",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="flow_countermeasures",
                to="threat_models.threatmodel",
            ),
        ),

        # 7. Update ordering
        migrations.AlterModelOptions(
            name="componentinstancecountermeasure",
            options={"ordering": ["created_at"]},
        ),
        migrations.AlterModelOptions(
            name="flowinstancecountermeasure",
            options={"ordering": ["created_at"]},
        ),
    ]
