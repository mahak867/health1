# HealthSphere Architecture

## System shape

- Monorepo with modular applications and shared contracts.
- Backend as API gateway + domain modules + WebSocket event stream.
- PostgreSQL as system of record.
- Offline-first clients with deferred sync.

## Domain modules

- Auth + RBAC
- Health care
- Fitness/workout + muscle ranking
- Nutrition + calculators + hydration
- Wearables ingestion
- Telemedicine scheduling
- Notifications
- Exports
- AI recommendations
- Social competition

## Security

- JWT access/refresh token model
- Role-based route protection
- CORS + Helmet hardening
- Audit trail schema
- Encrypted transport and secure secret handling
