# HealthSphere — Smart Health, Fitness, and Nutrition Platform

Production-ready monorepo scaffold for a unified healthcare, workout, and nutrition ecosystem.

## Monorepo structure

- `/apps/api` Node.js + Express + PostgreSQL + WebSocket backend
- `/apps/web` React web app scaffold (role dashboards)
- `/apps/admin` React admin panel scaffold
- `/apps/mobile_flutter` Flutter mobile/tablet/wearable scaffold
- `/packages/contracts` shared API and event contracts
- `/db/migrations` SQL schema and migration scripts
- `/.github/workflows` CI pipeline scaffold

## Quick start

1. Copy env:
   - `cp .env.example .env`
2. Install dependencies:
   - `npm install`
3. Start backend:
   - `npm run dev:api`

## Build and test

- Lint: `npm run lint`
- Test: `npm run test`

## Database

- Initial schema: `db/migrations/0001_init.sql`
- Core MVP extensions: `db/migrations/0002_core_mvp_extensions.sql`

## API and architecture docs

- Platform architecture: `docs/architecture.md`
- API overview: `docs/api.md`
- Deployment guide: `docs/deployment.md`
