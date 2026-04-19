# API Overview

Base path: `/api/v1`

## Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/google` (provider verification integration pending)

## Health
- `GET /health/profile`
- `PUT /health/profile`
- `GET /health/vitals`
- `POST /health/vitals`
- `GET /health/records`
- `POST /health/records`
- `GET /health/medications`
- `POST /health/medications`
- `POST /health/emergency/trigger`

## Fitness
- `GET /fitness/workouts`
- `POST /fitness/workouts`
- `GET /fitness/workouts/:workoutId/exercises`
- `POST /fitness/workouts/:workoutId/exercises`
- `GET /fitness/ranking`
- `GET /fitness/trainer/messages`

## Nutrition
- `GET /nutrition/meals`
- `POST /nutrition/meals`
- `GET /nutrition/hydration`
- `POST /nutrition/hydration`
- `GET /nutrition/calculators`

## Wearables
- `POST /wearables/sync`

## Telemedicine
- `GET /telemedicine/appointments`
- `POST /telemedicine/appointments`
- `POST /telemedicine/sessions/list`
- `POST /telemedicine/appointments/:appointmentId/sessions`

## Notifications
- `GET /notifications/preferences`

## Exports
- `GET /exports/reports`
- `POST /exports/reports`

## Advanced systems
- `GET /ranking/muscle`
- `GET /modes/plans`
- `POST /ai/recommendations`
- `GET /social/leaderboard`

WebSocket endpoint: `/ws`
