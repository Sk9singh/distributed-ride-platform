# Ride Platform

Distributed ride-hailing backend (Node.js + TypeScript, PostgreSQL, Kafka, Redis, RabbitMQ).
Built phase by phase; see `../.claude/PROJECT_SPEC.md`.

**Current status: Phase 1:** monorepo, Postgres, User Service, API Gateway.

## Prerequisites

- Node.js 20.6+ (uses `--env-file`)
- Docker Desktop (or OrbStack / colima)

## Run it

```bash
npm install                                   # also builds packages/common
cp services/user-service/.env.example services/user-service/.env   # if not present
cp services/api-gateway/.env.example services/api-gateway/.env

npm run db:up                                 # Postgres on :5432
npm run migrate:up -w @ride/user-service      # create tables in users_db

# two terminals
npm run dev -w @ride/user-service             # :3001
npm run dev -w @ride/api-gateway              # :3000
```

## Try it (everything through the gateway on :3000)

```bash
# register (public)
curl -s localhost:3000/users/register -H 'content-type: application/json' \
  -d '{"email":"asha@example.com","password":"password123","name":"Asha","role":"RIDER"}'

# login (public) → copy the token
TOKEN=$(curl -s localhost:3000/users/login -H 'content-type: application/json' \
  -d '{"email":"asha@example.com","password":"password123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

# protected route
curl -s localhost:3000/users/me -H "authorization: Bearer $TOKEN"
curl -s -i localhost:3000/users/me            # → 401
```

## Tests

```bash
npm test                                      # unit tests (no DB needed)
npm run test:int -w @ride/user-service        # integration tests (needs `npm run db:up`)
npm run lint && npm run typecheck
```

## Poke at Postgres

```bash
docker compose exec postgres psql -U user_svc -d users_db
\dt                        -- tables
\d users                   -- columns, constraints, indexes
\di                        -- indexes (note users_email_key, created by UNIQUE)
SELECT * FROM pgmigrations; -- what node-pg-migrate has applied
```

## Layout

```
packages/common/       logger, pg pool, errors, error handler, identity headers
services/user-service/ register/login/me, raw SQL migrations in migrations/
services/api-gateway/  request id, JWT check, reverse proxy
infra/postgres/init/   creates per-service roles and databases (runs once)
docs/learning-notes.md
```
