# Deployment Guide

## Quick-start (local development)

```bash
# 1. Clone and install
git clone https://github.com/mahak867/health1
cd health1
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# 3. Apply database migrations (requires psql)
for f in db/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done

# 4. Start API in watch mode
npm run dev:api
# → http://localhost:4000
# → ws://localhost:4000/ws

# 5. (Optional) Start web app
cd apps/web && npm install && npm run dev
# → http://localhost:5173
```

---

## Docker Compose (recommended for staging / local production testing)

```bash
# Set secrets (never commit real values)
export JWT_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)

docker compose up --build
# API:      http://localhost:4000
# Postgres: localhost:5432
```

Migrations run automatically on first startup because the `db/migrations/`
directory is mounted as `docker-entrypoint-initdb.d`.

---

## Production checklist

| Item | Notes |
|---|---|
| Managed PostgreSQL | AWS RDS, Supabase, or Neon. Enable auto-backups + WAL replication. |
| Secrets manager | AWS Secrets Manager / GCP Secret Manager — never hard-code JWT secrets. |
| HTTPS / TLS | Terminate at load balancer (ALB, Cloudflare). Set `ALLOWED_ORIGINS` to production frontend URL. |
| Container registry | Push image built from `Dockerfile` (multi-stage, non-root user). |
| Health check | `/healthz` — used by ECS/K8s liveness probe. |
| Rate limiting | `express-rate-limit` is active by default (120 req/min general, 20 req/min auth). Tune via env. |
| Observability | Ship `morgan` logs to CloudWatch / Datadog. Add APM agent of choice. |
| Migrations | Run `0001_init.sql` → `0004_rank_tiers_indexes_triggers.sql` in order on first deploy. |
| WebSocket | The `/ws` endpoint shares the same HTTP server — no separate port needed. |

---

## Environment variables reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Full PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | HMAC-SHA256 secret for access tokens (≥32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | — | Secret for refresh tokens (different from above) |
| `PORT` | — | `4000` | HTTP listen port |
| `NODE_ENV` | — | `development` | Set to `production` in prod |
| `JWT_EXPIRES_IN` | — | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | Refresh token lifetime |
| `ALLOWED_ORIGINS` | — | *(empty)* | Comma-separated CORS origins. Empty = allow all (dev only). |
| `GOOGLE_OAUTH_CLIENT_ID` | — | *(empty)* | Enables Google OAuth login flow |
