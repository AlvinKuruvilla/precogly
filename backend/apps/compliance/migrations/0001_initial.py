# Generated manually for compliance models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('packs', '0001_initial'),
        ('threats', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='StandardFramework',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('slug', models.SlugField(max_length=100, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('version', models.CharField(max_length=50)),
                ('issuer', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('source_pack', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='frameworks', to='packs.librarypack')),
            ],
            options={
                'ordering': ['name', 'version'],
            },
        ),
        migrations.CreateModel(
            name='StandardRequirement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('section_code', models.CharField(max_length=50)),
                ('description', models.TextField()),
                ('framework', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='requirements', to='compliance.standardframework')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='compliance.standardrequirement')),
            ],
            options={
                'ordering': ['framework', 'section_code'],
            },
        ),
        migrations.CreateModel(
            name='CountermeasureLibraryStandard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sufficiency', models.CharField(choices=[('full', 'Full'), ('partial', 'Partial')], default='partial', max_length=10)),
                ('countermeasure_library', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='standard_mappings', to='threats.countermeasurelibrary')),
                ('requirement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='countermeasure_mappings', to='compliance.standardrequirement')),
            ],
            options={
                'unique_together': {('countermeasure_library', 'requirement')},
            },
        ),
    ]
