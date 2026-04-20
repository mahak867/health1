# HealthSphere

An all-in-one health platform combining a **fitness tracker**, **nutrition tracker**, **wellness tools**, **telemedicine**, and a **social layer** — with a React web app, Flutter mobile app, and a React admin panel all powered by a single Node.js/PostgreSQL API.

---

## Features

### 🔐 Authentication & Roles
- Email/password sign-up and login with **JWT access + refresh token rotation** (`apps/api/src/modules/auth/routes.js`)
- Secure refresh-token storage (hashed, per-session revocation on logout)
- Roles: **user · doctor · trainer · nutritionist · admin** — role-based access enforced on every endpoint
- Rate-limited auth endpoints

### 📊 Vitals & Health Metrics
- Log and trend **heart rate, blood pressure (systolic/diastolic), SpO₂, temperature, sleep hours, stress level, calories burned** (`apps/api/src/modules/health/routes.js`)
- **Sleep stage breakdown** — REM, deep, light hours per night
- **Body weight + body fat %** tracking with 180-entry history
- **Water intake** logging with daily totals
- **Mood journal** — 1–5 emoji scale with notes and rolling average
- **Lab results** — cholesterol (total/HDL/LDL), triglycerides, fasting glucose, HbA1c, hemoglobin, hematocrit, TSH, Vitamin D, B12, ferritin, VO2Max
- **Body measurements** — waist, hips, chest, neck, arms, thighs, calves, shoulders
- Lifetime health stats aggregate (workouts, activities, meals, total XP, weight, streak)
- WebSocket `vitals` channel — real-time `vital_logged` push event

### 🏥 Health Profile & Records
- Health profile: age, height, weight, blood group, medical conditions, allergies, emergency contacts
- Generic **health records** (arbitrary type + detail fields)
- **Medication log** — name, dosage, frequency, start/end date, instructions; add and delete entries
- **Emergency trigger** — logs alert to audit trail and returns emergency contact list

### 🏋️ Fitness / Workouts
- Create, list, and delete **workouts** (title, duration, calories, start/end timestamps) (`apps/api/src/modules/fitness/routes.js`)
- Log **exercises per workout** (muscle group, exercise name, sets/reps/weight/rest seconds)
- **Automatic Personal Record detection** — Epley 1RM formula; upserts PR only when estimated 1RM improves; awards XP + lift badges (bench/squat/deadlift ≥ 100 kg)
- **Personal records list** — all-time bests per exercise
- **Workout templates** — save and reuse exercise blueprints (JSONB)
- **Workout calendar heatmap** — daily workout counts for the last 365 days
- **Exercise history** — last 20 sessions per exercise name (progressive overload hints)
- **Volume per muscle group** — weekly sets/reps/total volume for configurable window (up to 26 weeks)
- **Heart rate zones** — 5-zone Karvonen HRR method, age-predicted or measured max HR
- **Interval timer** — configurable work/rest/rounds with Tabata preset (web)
- **Session timer + per-exercise rest timer** (web)
- WebSocket `fitness` channel — real-time `workout_created` push event

### 🏃 Cardio Activities
- Log activities: **run · ride · walk · swim · hike · row · other** (`apps/api/src/modules/activities/routes.js`)
- Distance (m), duration, calories, avg heart rate, elevation, GeoJSON route polyline
- **Route minimap** — SVG polyline rendered from GeoJSON coordinates (web)
- **Distance Personal Bests** — fastest time for 5K, 10K, Half-Marathon, Marathon buckets with pace (min/km)
- **Kudos** — add/remove reactions on any activity; kudos count returned
- **Activity comments** — threaded comments per activity (add/list/delete)
- **Social feed** — merged workout + activity stream from followed users, sorted by recency

### 🥗 Nutrition
- Log **meals** (breakfast/lunch/dinner/snack) with full macro tracking: calories, protein, carbs, fat, fiber, sugar, sodium, micronutrients (JSONB) (`apps/api/src/modules/nutrition/routes.js`)
- **Hydration log** — milliliter entries; daily totals
- **Daily nutrition summary** — per-day aggregate of all macros + hydration
- **Nutrition / TDEE calculator** — Mifflin-St Jeor BMR, configurable activity factor and goal multiplier, NSCA macro split (`apps/api/src/modules/nutrition/service.js`)
- **Food database search** — proxied Open Food Facts API (no key required); maps per-100g macros
- **Barcode lookup** — EAN-13/UPC-A product lookup via Open Food Facts
- **Recipes** — create with ingredient list, auto-computed total macros; list and delete
- WebSocket `nutrition` channel — real-time `meal_logged` push event

### 🎮 Gamification
- **XP system** — points awarded for: workout logged (+30), activity (+25), PR set (+50), badge earned (+20), meal (+10), hydration (+5) (`apps/api/src/modules/gamification/service.js`)
- **Level progression** — triangular-number XP thresholds; returns level, progress %, XP to next level
- **20 badges** — workout milestones (1, 10, 50, 100), streaks (7-day, 30-day), strength PRs, meal and activity milestones, distance (5K, 10K), ranking tiers (gold, diamond), social follow, challenge completions
- **Daily and weekly challenges** — seeded in DB; progress incremented on action; XP awarded on completion (`apps/api/src/modules/gamification/routes.js`)
- **Workout streak** — consecutive-day calculation; awards streak badges automatically
- **Weekly summary** — workouts, meals, activities, XP gained, current streak

### 🏆 Strength Ranking & Leaderboard
- **Strength score** — Epley 1RM × body-weight ratio × consistency + volume progression factor (`apps/api/src/modules/ranking/service.js`)
- **9 tiers**: Wood → Bronze → Silver → Gold → Platinum → Diamond → Champion → Titan → Olympian
- Per-user per-muscle-group rankings upserted on POST (`apps/api/src/modules/ranking/routes.js`)
- **Global leaderboard** filterable by muscle group (`apps/api/src/modules/social/routes.js`)

### 🤝 Social
- **Follow / unfollow** users; followers and following lists (`apps/api/src/modules/social/routes.js`)
- **User search** — ILIKE name search with followers count
- **Suggested users** — users not yet followed, ordered by popularity

### 🤖 AI Engine
- **Recovery recommendations** — score (0–100), readiness level (high/moderate/low), rule-based engine using sleep hours, resting HR delta, and workout load (`apps/api/src/modules/ai/service.js`)
- **Nutrition insights** — protein adequacy (per-kg), deficit severity, leucine threshold checks
- **Fitness progress insights** — weekly volume change %, overload/undertraining risk, injury risk level
- **VO2Max estimation** — Uth-Sørensen formula from max HR + resting HR
- **Recommendation history** — persisted events with inputs + results
- **Context-aware AI chat** — natural-language query routing across recovery, nutrition, workouts, VO2max, and gamification topics; uses live user data

### 💪 Body Mode
- Modes: **cut · bulk · maintenance · recomposition** with evidence-based calorie and macro targets (`apps/api/src/modules/modes/routes.js`)
- User's active mode persisted and retrievable

### 🩺 Telemedicine
- Book **appointments** with provider users (start/end time, meeting URL) (`apps/api/src/modules/telemedicine/routes.js`)
- Appointment status lifecycle: scheduled → confirmed → in_progress → completed / cancelled / no_show
- **Consultation sessions** — notes and summary attached to appointments
- Patient + provider both see their shared appointments

### 🔔 Notifications
- **Notification preferences** — per-user email/push/SMS toggles and per-category overrides (`apps/api/src/modules/notifications/routes.js`)
- List user notifications; schedule future notifications (category, channel, payload, `scheduledAt`)

### ⌚ Wearables Sync
- Ingest up to 500 readings per batch (any provider, any metric type, timestamped) (`apps/api/src/modules/wearables/routes.js`)
- Query wearable data with optional provider + metric type filters

### 📤 Data Exports
- Request reports: **health / fitness / nutrition / combined**, format **PDF or CSV** (`apps/api/src/modules/exports/routes.js`)
- Reports queued in DB; users see their own; admins see all

### 🛡️ Admin Panel
- Platform stats — user counts by role, new signups (30d), vitals, workouts, meals, appointments, ranking entries, AI recommendations (`apps/api/src/modules/admin/routes.js`)
- User management — list (filter by role), view profile, update role
- Audit log viewer

### ⚡ Real-time (WebSocket)
- Subscribe/unsubscribe to named **channels** (`apps/api/src/websocket/gateway.js`)
- Published channels: `vitals`, `fitness`, `nutrition`, `trainer_chat`
- Ping/pong heartbeat
- Browser client helper in `apps/web/src/lib/ws.ts`

### 📱 Flutter Mobile App
- **Bottom navigation** — Home · Vitals · Workouts · Meals · Wellness · Profile (`apps/mobile_flutter/lib/main.dart`)
- **Biometric authentication gate** — fingerprint/face ID via `local_auth`
- **Home dashboard** — HR, sleep, calories burned/eaten, steps, water at a glance
- **Home-screen widget** — Android/iOS OS-level widget updated on every data change (`apps/mobile_flutter/lib/services/widget_service.dart`)
- **Vitals screen** — log HR, SpO₂, sleep, stress; stored locally in SQLite
- **Workouts screen** — log workouts with muscle group + exercise tracking
- **Meals screen** — log meals with macros
- **Breathwork/Wellness screen** — guided breathing techniques
- **GPS Activity Map** — real-time route tracing with live distance, pace, duration drawn on canvas; saves to SQLite on stop (`apps/mobile_flutter/lib/screens/activity_map_screen.dart`)
- **Barcode scan** — camera scan → Open Food Facts lookup → pre-fill meal form (`apps/mobile_flutter/lib/screens/barcode_scan_screen.dart`)
- **Mood screen** — 5-emoji scale + journal note, syncs to API (`apps/mobile_flutter/lib/screens/mood_screen.dart`)
- **HealthKit / Health Connect** — permission request + background pull (`apps/mobile_flutter/lib/services/health_sync.dart`)
- **Pedometer** — step count from device sensor (`apps/mobile_flutter/lib/services/pedometer_service.dart`)
- **SQLite offline-first store** — vitals, meals, workouts, step-log with `synced` flag (`apps/mobile_flutter/lib/services/local_db.dart`)
- **Background API sync** — unsynced rows posted to server on reconnect (`apps/mobile_flutter/lib/services/api_sync.dart`)
- **Push notifications** — hourly water reminders, daily workout reminders (`apps/mobile_flutter/lib/services/notification_service.dart`)

### 🌐 Web App (React)

| Page | File | What it does |
|------|------|--------------|
| Dashboard | `apps/web/src/pages/DashboardPage.tsx` | Summary widgets — vitals, workouts, nutrition, XP, streaks |
| Vitals | `apps/web/src/pages/VitalsPage.tsx` | Log vitals, sparkline trends, water tracker, weight log, sleep stages, mood, lab results, body measurements |
| Workouts | `apps/web/src/pages/WorkoutsPage.tsx` | Workout + exercise logger, PR flash, templates, heatmap, volume analytics, interval & rest timers |
| Meals | `apps/web/src/pages/MealsPage.tsx` | Meal log, food search, barcode lookup, recipes, water tab, daily macro rings |
| Activities | `apps/web/src/pages/ActivitiesPage.tsx` | Activity log, route minimap, kudos, distance PBs |
| Breathwork | `apps/web/src/pages/BreathworkPage.tsx` | Box, 4-7-8, Physiological Sigh, Wim Hof — animated breathing circle with phase countdown |
| Gamification | `apps/web/src/pages/GamificationPage.tsx` | XP ring, level, daily/weekly challenges, badge collection, weekly summary |
| Ranking | `apps/web/src/pages/RankingPage.tsx` | Interactive muscle body map, tier badges, global leaderboard |
| AI Engine | `apps/web/src/pages/AiPage.tsx` | Recovery readiness, nutrition insights, fitness progress, VO2Max, AI chat |
| Feed | `apps/web/src/pages/FeedPage.tsx` | Activity + workout stream from followed users with kudos |
| Notifications | `apps/web/src/pages/NotificationsPage.tsx` | Notification list, channel preference toggles |
| Profile | `apps/web/src/pages/ProfilePage.tsx` | Health profile, body mode selector, TDEE calculator, emergency contacts, measurements |
| Telemedicine | `apps/web/src/pages/TelemedicinePage.tsx` | Book and manage virtual appointments |
| Auth | `apps/web/src/pages/AuthPage.tsx` | Login / sign-up form |

**Offline support**: IndexedDB mutation queue + Service Worker flush on reconnect; `OfflineBanner` shows pending count (`apps/web/src/components/OfflineBanner.tsx`, `apps/web/src/lib/db.ts`)

### 🖥️ Admin Panel (React)

| Page | File |
|------|------|
| Overview | `apps/admin/src/pages/OverviewPage.tsx` |
| Users | `apps/admin/src/pages/UsersPage.tsx` |
| Analytics | `apps/admin/src/pages/AnalyticsPage.tsx` |
| Audit Log | `apps/admin/src/pages/AuditLogPage.tsx` |
| Reports | `apps/admin/src/pages/ReportsPage.tsx` |
| Providers | `apps/admin/src/pages/ProvidersPage.tsx` |

---

## Scaffold / WIP

The following are present in the codebase but **not yet fully implemented**:

- **Google OAuth** — `POST /api/v1/auth/google` returns HTTP 501; provider verification not wired
- **Report generation** — reports are queued (`status = 'queued'`); actual PDF/CSV rendering is not yet implemented
- **SMS notifications** — the `sms_enabled` preference flag exists; no SMS provider is wired
- **Trainer chat WebSocket channel** — `trainer_chat` is referenced in comments but has no dedicated message handler

---

## Monorepo structure

```
/
├── apps/
│   ├── api/                  — Node.js + Express + PostgreSQL + WebSocket backend
│   │   └── src/
│   │       ├── modules/      — Feature modules (auth, health, fitness, nutrition, …)
│   │       ├── core/         — Middleware (auth, audit, rate-limit, security, error)
│   │       ├── config/       — DB connection
│   │       └── websocket/    — WS gateway + publisher
│   ├── web/                  — React web app (Vite + Tailwind, port 5173)
│   ├── admin/                — React admin panel (Vite + Tailwind, port 3001)
│   └── mobile_flutter/       — Flutter mobile app
│       └── lib/
│           ├── screens/      — UI screens
│           └── services/     — LocalDb, HealthSync, Pedometer, Notifications, ApiSync, Widget
├── packages/
│   └── contracts/            — Shared API / event type contracts
├── db/
│   └── migrations/           — SQL schema (0001_init … 0009_body_measurements)
├── docs/                     — architecture.md · api.md · deployment.md
├── docker-compose.yml
└── Dockerfile
```

---

## Quick start

### 1) Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

### 2) Install dependencies

```bash
npm install
```

### 3) Start the API

```bash
npm run dev:api
# REST API at http://localhost:3000
# WebSocket at ws://localhost:3000/ws
```

### 4) Start the web app

```bash
cd apps/web && npm run dev
# http://localhost:5173
```

### 5) Start the admin panel

```bash
cd apps/admin && npm run dev
# http://localhost:3001
```

### 6) Run the Flutter app

```bash
cd apps/mobile_flutter
flutter pub get
flutter run
```

### Docker (API + DB)

```bash
docker-compose up
```

---

## Docs

- Architecture: [`docs/architecture.md`](docs/architecture.md)
- API reference: [`docs/api.md`](docs/api.md)
- Deployment: [`docs/deployment.md`](docs/deployment.md)

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Node.js 20, Express 5, PostgreSQL 16, `ws` WebSocket, Zod validation, JWT (access + refresh), bcrypt, Morgan, Helmet |
| **Web** | React 18, TypeScript 5, Vite 5, Tailwind CSS 3, IndexedDB (offline queue), Service Worker |
| **Admin** | React 18, TypeScript 5, Vite 5, Tailwind CSS 3 |
| **Mobile** | Flutter 3, Dart, sqflite (SQLite), HealthKit/Health Connect (`health` package), `local_auth` (biometrics), `mobile_scanner` (barcode), `geolocator`, `pedometer`, `flutter_local_notifications`, home-screen widget |
| **Database** | PostgreSQL with 9 migration files; JSONB for flexible payloads |
| **CI** | GitHub Actions (`.github/workflows`) |

---

## Contributing

PRs and suggestions are welcome. If you're adding a feature, please include:
- a short description
- screenshots (web/mobile) when relevant
- any new env vars documented in `.env.example`
