"""
Custom serializers for authentication.
"""

from dj_rest_auth.serializers import PasswordResetSerializer as BasePasswordResetSerializer
from .forms import CustomPasswordResetForm


class CustomPasswordResetSerializer(BasePasswordResetSerializer):
    """
    Custom password reset serializer that uses our custom form
    which generates frontend URLs instead of Django URLs.
    """

    password_reset_form_class = CustomPasswordResetForm
