# HealthSphere

All-in-one health app that combines a **fitness tracker**, **gym/workout tracker**, and **nutrition tracker** in a single platform.

## What you can do

- **Vitals & Trends**: log and visualize key health metrics (e.g., heart rate, blood pressure, SpO₂, temperature, sleep, stress, calories).
- **Fitness / Gym tracking**: create workouts, track exercises/sets/reps/weights, and follow progress over time.
- **Nutrition tracking**: log meals and hydration, view daily summaries, and use calorie/TDEE calculators.
- **Wearables sync**: ingest wearable readings and query wearable data.
- **Gamification & ranking**: XP, badges, challenges, tiers/leaderboards to stay consistent.
- **Real-time updates**: WebSocket events for vitals/fitness/nutrition feeds and notifications.

## Monorepo structure

- `/apps/api` — Node.js + Express + PostgreSQL + WebSocket backend
- `/apps/web` — React web app
- `/apps/admin` — React admin panel
- `/apps/mobile_flutter` — Flutter mobile app scaffold
- `/packages/contracts` — shared API/event contracts
- `/db/migrations` — SQL schema and migrations
- `/.github/workflows` — CI pipeline

## Quick start

### 1) Configure environment

```bash
cp .env.example .env
```

### 2) Install dependencies

```bash
npm install
```

### 3) Start the API

```bash
npm run dev:api
```

> The API includes REST endpoints plus a WebSocket server (see `docs/api.md`).

### 4) Start the web app (if available in scripts)

```bash
# common pattern in monorepos; adjust if your package.json differs
npm run dev:web
```

## Docs

- Architecture: `docs/architecture.md`
- API overview: `docs/api.md`
- Deployment: `docs/deployment.md`

## Tech stack (high level)

- **Backend**: Node.js, Express, PostgreSQL, WebSocket
- **Web**: React, TypeScript, Tailwind
- **Mobile**: Flutter (scaffold)

## Contributing

PRs and suggestions are welcome. If you’re adding a feature, please include:
- a short description
- screenshots (web/mobile) when relevant
- any new env vars documented in `.env.example`
