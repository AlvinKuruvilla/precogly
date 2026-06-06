import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AIProviderConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(help_text="Operator-facing label, e.g. 'Local LM Studio' or 'Team OpenAI'.", max_length=255)),
                ('provider_type', models.CharField(choices=[('openai_compat', 'OpenAI-compatible')], default='openai_compat', max_length=32)),
                ('base_url', models.URLField(help_text='OpenAI-style root exposing /chat/completions, e.g. http://localhost:1234/v1.')),
                ('model', models.CharField(help_text='Model name/identifier the endpoint expects.', max_length=255)),
                ('api_key_encrypted', models.TextField(blank=True, default='')),
                ('request_timeout', models.PositiveIntegerField(default=60, help_text='Seconds to wait for the model before failing with an error.')),
                ('is_default', models.BooleanField(default=False)),
                ('enabled', models.BooleanField(default=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_provider_configs', to='organizations.organization')),
            ],
            options={
                'ordering': ['organization_id', 'name'],
            },
        ),
        migrations.AddConstraint(
            model_name='aiproviderconfig',
            constraint=models.UniqueConstraint(fields=('organization', 'name'), name='unique_ai_provider_name_per_org'),
        ),
        migrations.AddConstraint(
            model_name='aiproviderconfig',
            constraint=models.UniqueConstraint(condition=models.Q(('is_default', True)), fields=('organization',), name='unique_default_ai_provider_per_org'),
        ),
    ]
