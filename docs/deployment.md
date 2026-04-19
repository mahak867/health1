# Deployment Guide

## Local

1. Set env values from `.env.example`
2. Run `npm install`
3. Apply migration in `/db/migrations/0001_init.sql`
4. Start API with `npm run dev:api`

## Production

- Containerize `/apps/api`
- Use managed PostgreSQL
- Store secrets in cloud secret manager
- Enable HTTPS, WAF, rate limiting, backups, and monitoring
- Configure push/email providers and wearable OAuth apps
