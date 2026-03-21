# Configuration

Precogly is configured through environment variables defined in a `.env` file at the project root. A commented example is provided at `.env.example`:

```bash
cp .env.example .env
```

For local development, Precogly works out of the box without a `.env` file — sensible defaults are built into the Docker Compose configuration. The `.env` file is only needed when you want to override defaults or deploy to production.

## Environment Variables

The values below reflect what `.env.example` provides for local development.

### Database

| Variable            | Dev Value                | Description          |
| ------------------- | ------------------------ | -------------------- |
| `POSTGRES_DB`       | `precogly`               | Database name        |
| `POSTGRES_USER`     | `precogly`               | Database user        |
| `POSTGRES_PASSWORD` | `precogly_dev_password`  | Database password    |
| `DATABASE_URL`      | `postgres://precogly:precogly_dev_password@db:5432/precogly` | Full connection string (uses `db` hostname inside Docker) |

### Django

| Variable                  | Dev Value                           | Description                |
| ------------------------- | ----------------------------------- | -------------------------- |
| `SECRET_KEY`              | `django-insecure-dev-key-change-in-production` | Django secret key |
| `DEBUG`                   | `True`                              | Enable debug mode          |
| `ALLOWED_HOSTS`           | `localhost,127.0.0.1`               | Accepted hostnames         |
| `DJANGO_SETTINGS_MODULE`  | `config.settings.development`       | Settings module to use     |

### CORS & Frontend

| Variable               | Dev Value                                       | Description                       |
| ---------------------- | ----------------------------------------------- | --------------------------------- |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost`          | Origins allowed for API requests |
| `FRONTEND_URL`         | `http://localhost:5173`                          | Used for password reset links     |

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
    Never use the default `SECRET_KEY` or `POSTGRES_PASSWORD` in production. Generate a random secret key with:

    ```bash
    python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
    ```

### What Production Settings Enable

The production settings module automatically configures HTTPS redirect, HSTS, secure cookies, `X-Frame-Options: DENY`, and content type sniffing protection. The frontend is served by nginx as a static bundle.
