# API Overview

Base path: `/api/v1`

All protected routes require `Authorization: Bearer <accessToken>`.

## Auth
- `POST /auth/signup` — Create user, returns access + refresh tokens
- `POST /auth/login` — Authenticate, returns access + refresh tokens
- `POST /auth/refresh` — Rotate refresh token, returns new token pair
- `POST /auth/logout` — Revoke refresh token
- `POST /auth/google` — Google OAuth (integration pending)

## Health
- `GET /health/profile` — Get health profile
- `PUT /health/profile` — Upsert health profile
- `GET /health/vitals` — List vitals (`?limit=`)
- `POST /health/vitals` — Log vital signs
- `GET /health/records` — List health records
- `POST /health/records` — Create health record
- `GET /health/medications` — List medications
- `POST /health/medications` — Add medication
- `POST /health/emergency/trigger` — Trigger emergency workflow

## Fitness
- `GET /fitness/workouts` — List workouts
- `POST /fitness/workouts` — Create workout
- `GET /fitness/workouts/:workoutId/exercises` — List exercises
- `POST /fitness/workouts/:workoutId/exercises` — Add exercise to workout
- `GET /fitness/trainer/messages` — Trainer communication scaffold

## Nutrition
- `GET /nutrition/meals` — List meal logs
- `POST /nutrition/meals` — Log a meal
- `GET /nutrition/hydration` — List hydration logs
- `POST /nutrition/hydration` — Log hydration
- `GET /nutrition/calculators` — TDEE/calorie target calculator (`?weightKg=&heightCm=&age=&sex=&activityFactor=`)

## Wearables
- `POST /wearables/sync` — Bulk ingest wearable readings
- `GET /wearables/data` — Query wearable data (`?provider=&metricType=&limit=`)

## Telemedicine
- `GET /telemedicine/appointments` — List appointments
- `POST /telemedicine/appointments` — Book appointment
- `POST /telemedicine/sessions/list` — List consultation sessions (body: `{appointmentId}`)
- `POST /telemedicine/appointments/:appointmentId/sessions` — Create consultation session

## Notifications
- `GET /notifications/preferences` — Get notification preferences
- `PUT /notifications/preferences` — Update notification preferences
- `GET /notifications/` — List notifications
- `POST /notifications/schedule` — Schedule a notification

## Exports
- `GET /exports/reports` — List export reports (admin: all, user: own)
- `POST /exports/reports` — Request a new export report

## Ranking
- `GET /ranking/muscle` — Calculate ranking for given muscle inputs (query params)
- `GET /ranking/my` — Get user's persisted muscle rankings
- `POST /ranking/my` — Calculate and persist muscle ranking

## Modes
- `GET /modes/plans` — Calculate mode targets (query params)
- `GET /modes/my` — Get user's active mode
- `PUT /modes/my` — Set/update user's mode

## AI
- `POST /ai/recommendations` — Get multi-signal recovery, nutrition, and fitness insights
- `GET /ai/history` — Get past recommendation events

## Social
- `GET /social/leaderboard` — Top muscle rankings (`?muscleGroup=&limit=`)
- `POST /social/follow` — Follow a user (`{followingId}`)
- `DELETE /social/follow` — Unfollow (`{followingId}`)
- `GET /social/following` — List followed users
- `GET /social/followers` — List followers

## Admin (admin role only)
- `GET /admin/users` — List all users (`?role=&limit=`)
- `GET /admin/users/:userId` — Get user + health profile
- `PATCH /admin/users/:userId` — Update user role
- `GET /admin/audit` — List audit log entries (`?limit=`)

## WebSocket
Endpoint: `ws://host/ws`

Subscribe: `{ "type": "subscribe", "channel": "vitals" }`

Channels: `vitals`, `fitness`, `nutrition`, `notifications`, `social`
