# Engineering Standards

A portable baseline for how I build and ship web applications. It is technology-opinionated
on purpose — defaults beat decisions when you're moving fast across projects — but every
default has a stated reason and an explicit "deviate when" clause.

This document is project-agnostic. The patterns here were proven out on a production
print-services platform (Next.js + Postgres + Redis + a third-party system-of-record), and
that codebase is referenced as the *worked example* throughout. When starting a new project,
copy this file, keep what fits, and record any deliberate deviations in the project's own
`CLAUDE.md` or `README`.

> **How to use this:** treat each section's checklist as the bar. A change isn't "done"
> until it clears the relevant checklists. Deviations are fine — they just have to be
> *decided*, not accidental, and written down.

---

## 1. Principles

These come first because every concrete rule below is downstream of them.

1. **One source of truth per piece of data.** Everything else is a cache, mirror, or
   projection — and is labeled as such. Never let two systems both believe they own the
   same record.
2. **The user-facing path is fast and cannot fail silently.** Slow or flaky work (emails,
   third-party APIs, analytics) runs *after* the response, never in front of it.
3. **Degrade, don't crash.** A missing cache, a down integration, or a blocked analytics
   script should narrow functionality, not return a 500. Decide the fallback for every
   external dependency.
4. **Idempotent by default.** Any sync, webhook handler, or retried operation must be safe
   to run twice. Key on stable external IDs.
5. **Never lose data you were given.** Store the raw payload alongside the parsed fields so
   a future schema change can't strand information you already received.
6. **Validate at the boundary.** Untrusted input is parsed and rejected at the edge of the
   system, before it touches business logic.
7. **Make decisions legible.** Non-obvious choices get a one-line comment with the *why*,
   ideally linking the ticket. Code explains how; comments explain why.

---

## 2. Default Stack

The baseline. Reach for these unless the project has a specific reason not to.

| Layer | Default | Why | Deviate when |
|---|---|---|---|
| Language | **TypeScript**, `strict: true` | Catch errors at build, not runtime | Never, for app code |
| Framework | **Next.js (App Router) + React** | RSC, file routing, one deploy unit for UI + API | Pure API → consider a lighter server; static-only → SSG/CDN |
| Styling | **Tailwind CSS** + shadcn/ui + CVA for variants | No naming bikeshed, design tokens via CSS vars, CSP-safe | Heavy bespoke design system |
| Validation | **Zod** | One schema = runtime check + inferred type | — |
| Relational data | **Postgres** (`pg` with pooling) | JSONB, trigram search, generated columns, mature | Truly relational-light → managed KV |
| Cache / session / dedup | **Redis** (`ioredis`) | Sessions, indexes, one-time-token dedup, single-flight | Single instance + no sessions → in-memory is fine to start |
| Auth | **Auth.js / NextAuth** (JWT sessions) | Stateless sessions, multiple providers, no DB adapter needed | Enterprise SSO requirements |
| Object storage | **S3-compatible** (e.g. Cloudflare R2) | Cheap, no egress lock-in, standard SDK | — |
| Email | **Transactional provider** (e.g. Resend) | Deliverability + templates without running mail infra | — |
| Analytics | **Product analytics** (e.g. PostHog) + server-side events | Client *and* server capture so ad-blockers can't blind you | — |
| Deploy | **Container on a managed platform** (e.g. Railway) | Long-lived process for pooled DB + warm caches | Pure edge/static → serverless |

**State management:** prefer Server Components and URL state. Reach for a client store
(Zustand) only for genuinely client-side, cross-component state.

---

## 3. Project Structure

```
src/
  app/                  # Routes (App Router). Pages + colocated API routes.
    api/<feature>/route.ts
    (public pages)
    admin/  account/  staff/   # auth-gated sections
  components/
    ui/                 # Primitives (shadcn). Dumb, reusable.
    shared/             # Business components used in 2+ places.
    <feature>/          # Feature-scoped components.
  lib/                  # Core logic & integrations. One file per concern.
    db.ts               # Connection pool
    redis.ts            # Client + helpers
    auth.ts auth.config.ts
    <integration>.ts    # One wrapper per external service
db/migrations/          # Numbered SQL: 001_init.sql, 002_*.sql
tools/                  # CLI tooling, MCP servers, scripts
docs/                   # This file lives here, alongside specs & runbooks
```

**Rules:**
- **`lib/` is the brain.** API routes and components stay thin; they call into `lib/`.
  Business logic does not live in route handlers.
- **One file per integration.** All Stripe code in `lib/stripe.ts`, all email in
  `lib/email.ts`. A reader should find the entire surface of an external dependency in
  one place.
- **Kebab-case filenames** (`printavo-mirror.ts`), `route.ts` for API endpoints, `.tsx`
  for components.
- **Path alias `@/*` → `src/*`.** No `../../../` imports.

---

## 4. Architecture Patterns

These are the reusable shapes. Each one solved a real problem; use them when the problem
recurs.

### 4.1 Source-of-truth + local mirror
When a third-party SaaS owns the data (CRM, billing, PMS) but you need fast, queryable
reads, **mirror it into Postgres**:
- The SaaS stays authoritative for writes.
- Postgres holds a read-optimized copy, keyed on the SaaS's stable IDs.
- Store the **full raw payload in a JSONB column** plus the specific fields you query on.
- A sync job (cron + webhooks) keeps the mirror fresh; `synced_at` makes staleness visible.
- Reads hit the mirror (O(1), indexed); the SaaS API is the fallback when the mirror misses.

### 4.2 Fire-and-forget pipelines
The customer-facing request does the minimum to respond, then kicks off the slow work
without awaiting it:
```
1. Validate input (Zod)            ← fast, can reject
2. Persist the essential record    ← fast
3. Return success to the user      ← user is now unblocked
4. Background: email, CRM sync, Slack ping, analytics  ← may be slow/flaky
```
Each background step has its own try/catch. A failure there logs + alerts but **never
changes what the user saw**.

### 4.3 Caching & single-flight
- Warm expensive caches on boot (`instrumentation.ts`) so the first request isn't the slow one.
- Guard expensive external crawls with a **single-flight lock**: if a fetch is already in
  flight, new callers await the same promise instead of stampeding the API.
- Use Redis for the cross-request indexes (e.g. `email → customer_id` hash).

### 4.4 Graceful degradation
Every external dependency has a decided failure mode:
- Redis down → JWT sessions still work (stateless), indexes rebuild lazily.
- SaaS API down → serve from the mirror; queue the write.
- Analytics blocked client-side → server-side event still fires.

### 4.5 Wrapping a third-party API (the standard shape)
Every integration module exposes: typed functions, internal error handling, and a clear
fallback. Callers never see raw SDK errors or have to know the transport.
```ts
// lib/<service>.ts
export async function getThing(id: string): Promise<Thing | null> {
  try {
    const res = await client.query(...)
    return parse(res)            // map external shape → domain model
  } catch (err) {
    console.error('[service] getThing failed', err)
    return null                  // decided fallback, not a thrown 500
  }
}
```

---

## 5. Data Layer

- **Migrations are numbered SQL files**, forward-only, committed to the repo
  (`db/migrations/001_init.sql`). Never edit a shipped migration; add a new one.
- **Every table gets** `created_at`, `updated_at`, and (for mirrored data) `synced_at`.
- **Index foreign keys and anything you filter/search on.** For fuzzy text search, use a
  **trigram (`pg_trgm`) index** on a generated `search_text` column.
- **JSONB for raw payloads** from external systems — you never lose a field, and schema
  changes upstream don't break you.
- **Parameterized queries only.** No string interpolation into SQL, ever.
- **Mirrors are idempotent.** `INSERT ... ON CONFLICT (external_id) DO UPDATE`. Re-running a
  sync is always safe.
- Transform DB rows into domain models at the boundary (`toThing(row)`), so the rest of the
  app speaks types, not column names.

---

## 6. Security

The non-negotiable baseline for anything internet-facing.

- **Validate all input with Zod at the route boundary.** Reject before any logic runs.
- **Strict Content-Security-Policy** in production (no `unsafe-eval`; allowlist sources).
  Plus HSTS, `X-Frame-Options`, `Referrer-Policy`, COOP.
- **Auth model:** stateless JWT sessions. Magic links for end users (short expiry,
  **one-time-use enforced via a Redis JTI dedup** to kill replay), credentials/SSO for
  staff. Role-based gates (`customer` / `staff` / `admin`) enforced at the request edge.
  On **Next.js 16+ this is the `proxy.ts` convention** (`middleware.ts` is deprecated);
  with Auth.js v5, export the edge handler as `export default auth` — a destructured
  `export const { auth: proxy }` is not recognized as a function export.
- **CORS/CSRF:** mutation endpoints check an **origin allowlist**; webhooks verify
  **signatures** before doing any work.
- **File uploads:** whitelist MIME type *and* extension, cap per-file and total size, and
  force `Content-Disposition: attachment` for anything renderable (e.g. SVG) to prevent
  stored XSS.
- **SSRF guard:** any user-supplied URL that the server will fetch or forward goes through
  an allowlist first.
- **Rate-limit public endpoints** (IP-based; Redis-backed in prod, in-memory acceptable for
  a single instance). Return `429`.
- **Escape all interpolated values in HTML emails.**
- **Secrets live in env**, never in git. `NEXT_PUBLIC_*` only for values safe in the browser.

> Run a security pass on any change touching auth, uploads, external fetches, or raw SQL
> before merging.

---

## 7. Code Conventions

- **TypeScript strict.** No `any` without a comment justifying it. Export types for every
  domain model.
- **Naming:** `camelCase` values/functions, `PascalCase` types/components,
  `SCREAMING_SNAKE` consts, kebab-case files.
- **Error handling:** `try/catch` around every I/O boundary. Non-fatal failures are
  **logged with a tagged prefix** (`[db]`, `[auth]`, `[sync]`) and swallowed; critical-path
  failures additionally **alert a human** (Slack/PagerDuty). Customer-facing errors are
  generic — never leak internals.
- **Comments explain *why*.** Link the ticket for non-obvious decisions. Match the
  surrounding file's comment density.
- **No dead code behind disabled flags.** Use environment-based feature gates and remove
  abandoned branches.
- **Functions do one thing.** Parsing, fetching, and transforming are separate functions.

---

## 8. Frontend / UI

- **Server Components by default.** Add `'use client'` only when you need interactivity,
  browser APIs, or client state.
- **shadcn/ui primitives** in `components/ui/`; compose upward. **CVA** for component
  variants — no ad-hoc conditional class strings for variant logic.
- **Tailwind only**, design tokens as CSS variables (theming + dark mode without
  `unsafe-inline`). No CSS modules or styled-components.
- **Accessibility is part of "done":** semantic HTML, labeled controls, keyboard-navigable,
  visible focus states. Lean on Radix primitives for complex interactions (menus, dialogs).
- **Images** go through the framework's image component with an explicit domain allowlist.

---

## 9. Performance

- **Pooled DB connections** (don't open per-request). One long-lived process.
- **Server-side, windowed pagination** for any list that can grow — never load all rows
  into memory.
- **Warm caches on boot**, single-flight expensive fetches (§4.3).
- **Content-hashed static assets** get a 1-year immutable cache header.
- **Index before you optimize queries.** Measure with `EXPLAIN` if a query is slow; don't guess.

---

## 10. Observability

- **Product analytics on the client *and* server** so ad-blockers can't create blind spots.
- **Identify users on sign-in** to tie events to people.
- **Tagged console logging** (`[feature]`) — greppable, parseable.
- **Alert humans on critical-path failures** (failed order, failed payment, failed
  contact-form delivery) via Slack/PagerDuty, with the full payload so it can be recovered manually.
- **Production source maps enabled** for real stack traces in error tracking.

---

## 11. Configuration & Deployment

- **Secrets in env**, injected by the platform. A committed `.env.example` documents every
  required variable (names only, no values).
- **Containerized** (`node:20-slim`-ish base), multi-stage build, **runs as a non-root
  user**, prunes dev dependencies in the final image.
- **Scheduled work via platform cron** hitting an internal endpoint (e.g.
  `/api/cron/<job>`), protected by a shared secret.
- **Document deploy + rollback** in the repo. A deploy should be one command or one merge.

---

## 12. Tooling

- **ESLint** (flat config) extending the framework's recommended + web-vitals rules. Lint
  passes before merge. On **Next.js 16**, import the flat config directly
  (`import nextVitals from "eslint-config-next/core-web-vitals"`); the older
  `FlatCompat` + `extends(...)` shim crashes with a circular-JSON error.
- **`@/*` path alias** configured in `tsconfig`.
- **MCP servers / CLI tooling in `tools/`**, declared in `.mcp.json` when used with Claude Code.
- Keep `package.json` scripts boring and standard: `dev`, `build`, `start`, `lint`.

---

## 13. Definition of Done (technical checklist)

A change is shippable when:

- [ ] Input validated at the boundary; invalid input rejected cleanly.
- [ ] User-facing path is fast; slow/flaky work is fire-and-forget with its own error handling.
- [ ] Every external dependency in the change has a decided fallback.
- [ ] New syncs/handlers are idempotent and keyed on stable IDs.
- [ ] Migrations are numbered, forward-only, and committed.
- [ ] Security checklist (§6) cleared for anything touching auth, uploads, fetches, or SQL.
- [ ] Errors are logged with tags; critical failures alert a human.
- [ ] Non-obvious decisions have a why-comment.
- [ ] `lint` and `build` pass; no new `any` without justification.
- [ ] Any deviation from these standards is recorded in the project's `CLAUDE.md`/`README`.

---

## 14. Testing

**Default: Vitest** for unit tests over the pure logic in `lib/`. The starter ships a
working `vitest.config.ts` (with the `@/*` alias wired) and sample tests, so there's no
setup friction — `npm test` works on a fresh clone. Decide the depth per project and record
it here:
- Unit-test the pure logic in `lib/` (transformers, validators, escaping, pricing/calc).
- Integration-test the critical money/auth paths.
- Smoke-test the happy path end-to-end before each release.

Older projects (including the original reference app) predate this and lean on typed
boundaries, Zod validation, and manual QA on deploy previews — treat that absence as a known
gap to close, not a standard to keep.

---

*Living document. When a project teaches a better default, update this file and note what changed.*
