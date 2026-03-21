# Configuration

Precogly is configured through environment variables. Copy the example file to get started:

```bash
cp .env.example .env
```

## Environment Variables

### Database

| Variable            | Default                  | Description          |
| ------------------- | ------------------------ | -------------------- |
| `POSTGRES_DB`       | `precogly`               | Database name        |
| `POSTGRES_USER`     | `precogly`               | Database user        |
| `POSTGRES_PASSWORD` | `precogly_dev_password`  | Database password    |
| `DATABASE_URL`      | `postgres://precogly:precogly_dev_password@db:5432/precogly` | Full connection string |

### Django

| Variable                  | Default                             | Description                |
| ------------------------- | ----------------------------------- | -------------------------- |
| `SECRET_KEY`              | insecure dev key                    | Django secret key          |
| `DEBUG`                   | `True`                              | Enable debug mode          |
| `ALLOWED_HOSTS`           | `localhost,127.0.0.1`               | Accepted hostnames         |
| `DJANGO_SETTINGS_MODULE`  | `config.settings.development`       | Settings module to use     |

### CORS & Frontend

| Variable               | Default                               | Description                       |
| ---------------------- | ------------------------------------- | --------------------------------- |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost` | Origins allowed for API requests |
| `FRONTEND_URL`         | `http://localhost:5173`               | Used for password reset links     |

## Settings Modules

Precogly uses split settings for different environments:

| Module                        | When used   | Key differences                                |
| ----------------------------- | ----------- | ---------------------------------------------- |
| `config.settings.development` | Local dev   | `DEBUG=True`, permissive CORS, debug toolbar   |
| `config.settings.production`  | Deployment  | `DEBUG=False`, HTTPS enforced, strict CORS     |

Set the active module via `DJANGO_SETTINGS_MODULE`.

## Production Deployment

Use the production Docker Compose file:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

This overrides the dev config with production targets and settings.

### Required Production Variables

These **must** be set in your `.env` for production:

```bash
SECRET_KEY=your-random-secret-key-here
POSTGRES_PASSWORD=a-strong-database-password
ALLOWED_HOSTS=yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
DJANGO_SETTINGS_MODULE=config.settings.production
```

!!! warning
    Never use the default `SECRET_KEY` or `POSTGRES_PASSWORD` in production. Generate a random secret key with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`.

### Production Security Settings

The production settings module automatically enables:

- HTTPS redirect (`SECURE_SSL_REDIRECT`)
- HSTS with 1-year max age
- Secure cookies (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`)
- `X-Frame-Options: DENY`
- Content type sniffing protection

### Frontend in Production

The frontend is served by nginx on port 80, built as a static bundle. The backend runs behind gunicorn with 4 workers.
