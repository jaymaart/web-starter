# Web Starter

An opinionated Next.js starter that ships the [Engineering Standards](docs/ENGINEERING-STANDARDS.md)
baseline pre-wired. Clone it to start a new project with the patterns already in place
instead of re-deciding them every time.

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in what you need; the app boots with none of it
npm run dev                  # http://localhost:3000
```

The app runs with **zero environment configured** — every client (Postgres, Redis,
email, alerts) is lazy and degrades gracefully, so you wire integrations in as you go.

```bash
npm run build   # production build — the bar for "done" (§13)
npm run lint    # eslint (next core-web-vitals + typescript)
npm test        # vitest — unit tests over src/lib/
```

## What's wired in

| Standard | Where |
|---|---|
| Strict TypeScript + `@/*` alias | `tsconfig.json` |
| Security headers (CSP, HSTS, COOP, …) | `next.config.ts` |
| Auth.js (JWT sessions, RBAC, route gate) | `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts` |
| Pooled Postgres, parameterized queries | `src/lib/db.ts` |
| Redis (lazy, graceful fallback) | `src/lib/redis.ts` |
| Rate limiting (Redis + in-memory fallback) | `src/lib/rate-limit.ts` |
| Origin allowlist for mutations | `src/lib/security.ts` |
| Transactional email + HTML escaping | `src/lib/email.ts` |
| Critical-path alerting | `src/lib/alerts.ts` |
| Tagged logging | `src/lib/logger.ts` |
| Third-party integration shape (§4.5) | `src/lib/example-service.ts` |
| Zod boundary + fire-and-forget pipeline | `src/app/api/contact/route.ts` |
| Vitest unit tests (§14), `@/*` alias wired | `vitest.config.ts`, `src/lib/*.test.ts` |
| Boot-time warm-up hook | `src/instrumentation.ts` |
| Migrations (trigram search, JSONB, mirror) | `db/migrations/001_init.sql` |
| CVA UI primitive | `src/components/ui/button.tsx` |
| Non-root multi-stage container | `Dockerfile` |

## Project structure

See [docs/ENGINEERING-STANDARDS.md §3](docs/ENGINEERING-STANDARDS.md). In short: routes
and components stay thin; `src/lib/` holds the logic and one file per integration.

## Starting a new project from this

1. Clone, then `rm -rf .git && git init`.
2. Rename in `package.json`.
3. Delete the example integration (`src/lib/example-service.ts`) once you have real ones.
4. Record any deliberate deviations from the standards in this README or a `CLAUDE.md`.
