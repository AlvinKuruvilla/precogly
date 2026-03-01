"""
Clean up DFDTemplatesLibrary:
- Remove choices constraint from category (now freeform, max_length 50)
- Remove unused aliases ArrayField
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("diagrams", "0004_migrate_canvas_data_trust_zone"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dfdtemplateslibrary",
            name="category",
            field=models.CharField(
                help_text="Freeform category (e.g., webapp, serverless, microservices)",
                max_length=50,
            ),
        ),
        migrations.RemoveField(
            model_name="dfdtemplateslibrary",
            name="aliases",
        ),
    ]
