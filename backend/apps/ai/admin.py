"""Admin management for per-tenant AI provider configs.

This is the management bridge until a first-class settings UI exists: operators
can add, edit, and test an organization's model here. The API key is treated as
write-only — the form accepts a new value but never renders the stored one, the
same posture the eventual UI will take — and a "test connection" action probes
the endpoint without running a real completion.
"""

from django import forms
from django.contrib import admin, messages

from .models import AIProviderConfig
from .providers.base import AIProviderError
from .providers.registry import build_provider


class AIProviderConfigForm(forms.ModelForm):
    """Form that accepts a new API key but never echoes the stored one back."""

    api_key = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Leave blank to keep the existing key. Enter a value to replace it.",
    )

    class Meta:
        model = AIProviderConfig
        # api_key_encrypted is managed through the write-only api_key field above.
        exclude = ["api_key_encrypted"]

    def save(self, commit: bool = True) -> AIProviderConfig:
        config = super().save(commit=False)
        new_key = self.cleaned_data.get("api_key")
        # Blank means "don't touch the stored key"; a value replaces it.
        if new_key:
            config.set_api_key(new_key)
        if commit:
            config.save()
        return config


@admin.register(AIProviderConfig)
class AIProviderConfigAdmin(admin.ModelAdmin):
    form = AIProviderConfigForm
    list_display = (
        "name",
        "organization",
        "provider_type",
        "model",
        "base_url",
        "is_default",
        "enabled",
    )
    list_filter = ("provider_type", "is_default", "enabled", "organization")
    search_fields = ("name", "model", "base_url")
    actions = ["probe_connection"]

    @admin.action(description="Test connection to the selected provider(s)")
    def probe_connection(self, request, queryset):
        for config in queryset:
            try:
                health = build_provider(config.to_resolved_config()).test_connection()
            except AIProviderError as err:
                # Bad provider_type or an undecryptable key — report, don't crash.
                self.message_user(request, f"{config.name}: {err}", messages.ERROR)
                continue
            level = messages.SUCCESS if health.ok else messages.WARNING
            self.message_user(request, f"{config.name}: {health.detail}", level)
