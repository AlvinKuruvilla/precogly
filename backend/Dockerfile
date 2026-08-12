# ---- Base ----
FROM python:3.12-slim AS base

# uv defaults the venv to $PROJECT/.venv, which docker-compose.yml's
# ./backend:/app mount would shadow. uv's Docker guide masks it with an
# anonymous volume; compose carries those across container recreation (-V opts
# out), so a rebuild after a dependency change would silently serve the old venv.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.9.13 /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./

# ---- Development ----
FROM base AS dev

# --frozen fails on a stale uv.lock instead of re-resolving, so an image cannot
# be built from dependencies nobody committed.
RUN uv sync --frozen --no-install-project

ENV DJANGO_SETTINGS_MODULE=config.settings.development

COPY . .

EXPOSE 8000

# precogly-mcp is installed at container start, not at build time: it is
# unreleased, so it comes from the working copy that docker-compose mounts at
# /precogly-mcp, which does not exist while the image is being built. Installing
# it here rather than by hand is what keeps `docker compose up` sufficient.
#
# `uv pip`, not `pip`: uv sync builds a venv without pip in it, so plain pip
# would either not resolve or land in the system interpreter. --python names the
# target because uv pip reads VIRTUAL_ENV, which UV_PROJECT_ENVIRONMENT does not
# set.
CMD ["sh", "-c", "uv pip install --python /opt/venv --no-cache-dir -e /precogly-mcp && python manage.py migrate --noinput && python manage.py seed && python manage.py runserver 0.0.0.0:8000"]

# ---- Production ----
FROM base AS prod

# uv installs `dev` by default; --no-default-groups drops it.
RUN uv sync --frozen --no-install-project --no-default-groups --group prod

ENV DJANGO_SETTINGS_MODULE=config.settings.production

COPY . .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --threads 2"]
