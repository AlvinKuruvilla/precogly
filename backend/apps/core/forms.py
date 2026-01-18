"""
Custom forms for authentication.
"""

from django.conf import settings
from django.contrib.auth.forms import PasswordResetForm as DjangoPasswordResetForm

# Use allauth's token generator for compatibility with dj-rest-auth
if 'allauth' in settings.INSTALLED_APPS:
    from allauth.account.forms import default_token_generator
else:
    from django.contrib.auth.tokens import default_token_generator


class CustomPasswordResetForm(DjangoPasswordResetForm):
    """
    Custom password reset form that generates frontend URLs instead of
    using Django's URL reversal (which requires Django's auth URLs).

    Uses allauth's base36 encoding for user pk to be compatible with
    dj-rest-auth's password reset confirm endpoint.
    """

    def save(
        self,
        domain_override=None,
        subject_template_name="registration/password_reset_subject.txt",
        email_template_name="registration/password_reset_email.html",
        use_https=False,
        token_generator=default_token_generator,
        from_email=None,
        request=None,
        html_email_template_name=None,
        extra_email_context=None,
    ):
        """
        Generate a one-use only link for resetting password and send it to the user.

        This override provides the frontend URL directly in the email context
        instead of trying to reverse Django's password_reset_confirm URL.
        """
        from django.contrib.auth import get_user_model
        from allauth.account.utils import user_pk_to_url_str

        UserModel = get_user_model()
        email = self.cleaned_data["email"]
        email_field_name = UserModel.get_email_field_name()

        # Get the frontend URL from settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

        for user in self.get_users(email):
            user_email = getattr(user, email_field_name)
            context = {
                'email': user_email,
                # Use allauth's base36 encoding for compatibility with dj-rest-auth
                'uid': user_pk_to_url_str(user),
                'user': user,
                'token': token_generator.make_token(user),
                'protocol': 'https' if use_https else 'http',
                'frontend_url': frontend_url,
            }
            if extra_email_context is not None:
                context.update(extra_email_context)

            self.send_mail(
                subject_template_name,
                email_template_name,
                context,
                from_email,
                user_email,
                html_email_template_name=html_email_template_name,
            )
