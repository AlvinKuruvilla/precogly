# Development Setup

Use this guide when you want to contribute code or documentation to Precogly. The **recommended local workflow is Docker Compose** because it starts the same three services most contributors need: the React frontend, the Django API, and PostgreSQL. You can still run frontend commands such as `npm run dev` directly from `frontend/`, but Docker Compose is the fastest way to get a complete working application with seeded demo data.

The development stack mounts the backend source, the frontend `src/` directory, and the shared `libraries/` directory into the containers. That means most frontend and backend code edits are picked up without rebuilding the whole stack. Rebuild when you change dependencies, Dockerfiles, or other files copied into the images during build.

## Local Architecture

```text
Browser
  |
  | http://localhost:5173
  v
precogly-frontend
  React + Vite dev server
  |
  | /api and /media requests
  v
precogly-backend
  Django + Django REST Framework
  |
  | postgres://db:5432/precogly
  v
precogly-postgres
  PostgreSQL 16
```

The frontend talks to the backend through Vite's development proxy. The browser sends API requests to `/api`, and Vite forwards them to the backend container using the `API_URL` value from `docker-compose.yml`.

## Prerequisites

Install:

| Tool | Used for |
| --- | --- |
| Docker and Docker Compose | Running the application stack |
| Git | Cloning the repository and preparing pull requests |
| Node.js 22+ | Optional direct frontend workflow |
| Python 3.12+ | Optional direct backend workflow |

## Start the Stack

From the **repository root**:

```bash
docker compose up --build
```

The first run builds the images, creates the PostgreSQL volume, runs migrations, and seeds demo data. After the services start, open [http://localhost:5173](http://localhost:5173) and log in with:

| Field | Value |
| --- | --- |
| Email | `admin@precogly.dev` |
| Password | `admin123` |

The backend API is available at [http://localhost:8000](http://localhost:8000), and the Django admin is available at [http://localhost:8000/admin](http://localhost:8000/admin) with the same demo credentials.

## Verify the Stack

Use `docker compose ps` to confirm that all three services are running:

```bash
docker compose ps
```

You should see:

| Service | Expected status |
| --- | --- |
| `precogly-frontend` | Running on port `5173` |
| `precogly-backend` | Running on port `8000` |
| `precogly-postgres` | Healthy on port `5432` |

## Daily Development Commands

Run these from the **repository root** unless noted otherwise:

```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
docker compose down
```

Use `docker compose down -v` only when you want to delete the local database volume and reseed from scratch on the next startup.

## Frontend Workflow

The frontend container runs Vite on port `5173`. API calls use `/api` in the browser and are proxied by Vite to the backend container through the `API_URL` value in `docker-compose.yml`.

For direct local frontend work, install dependencies and start Vite from `frontend/`:

```bash
npm install
npm run dev
```

Before opening a frontend pull request, run:

```bash
npm run build
npm run lint
```

Frontend changes should include screenshots or a short screen recording in the pull request description.

## Backend Workflow

The backend container runs migrations, seeds demo data, and starts Django on port `8000`. To run backend commands inside the same environment as the app:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed
docker compose exec backend python manage.py test
```

For direct local backend work, create a virtual environment, install development requirements from `backend/requirements/development.txt`, set `DJANGO_SETTINGS_MODULE=config.settings.development`, and run commands from `backend/`.

## Troubleshooting

If the frontend loads but API requests fail, check that the backend is healthy with `docker compose ps` and inspect logs with `docker compose logs backend`. If the database is in a bad local state, stop the stack with `docker compose down -v` and start again with `docker compose up --build`.

If ports `5173`, `8000`, or `5432` are already in use, stop the conflicting process or change the port mapping in `docker-compose.yml`. Keep any changed local port mappings out of the pull request unless the project intentionally needs them.

For a local PostgreSQL conflict, prefer setting `POSTGRES_PORT` instead of editing `docker-compose.yml`:

```bash
POSTGRES_PORT=5433 docker compose up --build
```
