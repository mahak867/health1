# API Overview

Base path: `/api/v1`

## Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/google` (provider verification integration pending)

## Protected module roots
- `/health`
- `/fitness`
- `/nutrition`
- `/wearables`
- `/telemedicine`
- `/notifications`
- `/exports`
- `/ranking`
- `/modes`
- `/ai` (`POST /ai/recommendations`)
- `/social`

WebSocket endpoint: `/ws`
