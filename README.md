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
   - `cp /home/runner/work/health1/health1/.env.example /home/runner/work/health1/health1/.env`
2. Install dependencies:
   - `npm install`
3. Start backend:
   - `npm run dev:api`

## Build and test

- Lint: `npm run lint`
- Test: `npm run test`

## Database

- Initial schema: `/home/runner/work/health1/health1/db/migrations/0001_init.sql`

## API and architecture docs

- Platform architecture: `/home/runner/work/health1/health1/docs/architecture.md`
- API overview: `/home/runner/work/health1/health1/docs/api.md`
- Deployment guide: `/home/runner/work/health1/health1/docs/deployment.md`
