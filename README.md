# RupeeFlow — Expense Tracker & Budget Management System

A personal-finance web app: register, log expenses against your own categories, set a monthly limit per category, and review spending on a dashboard and in monthly/yearly reports you can download as CSV or Excel. It works on mobile and desktop, with light and dark themes.

The implementation follows the project plan in [`docs/PLAN.md`](docs/PLAN.md). [`docs/AUDIT.md`](docs/AUDIT.md) maps every requirement to the code and tests that satisfy it.

| | |
|---|---|
| **Frontend** | React 18 · TypeScript · Vite · React Router 6 · TanStack Query · React Hook Form + Zod · Axios · Tailwind CSS · Recharts · date-fns |
| **Backend** | Node.js · Express · TypeScript · Prisma ORM · Zod · jsonwebtoken · bcrypt · fast-csv · exceljs · helmet · cors · express-rate-limit |
| **Database** | PostgreSQL 16 (UUID keys, `NUMERIC(12,2)` money, CHECK constraints, composite indexes) |
| **Tests** | Jest + Supertest (API, real Postgres) · Vitest + React Testing Library + MSW · Playwright E2E |

---

## Contents
1. [Prerequisites](#prerequisites)
2. [Quick start](#quick-start)
3. [Backend setup](#backend-setup)
4. [Frontend setup](#frontend-setup)
5. [Environment variables](#environment-variables)
6. [Database: migrations, seeding, reset](#database-migrations-seeding-reset)
7. [Running tests](#running-tests)
8. [API reference](#api-reference)
9. [Folder structure](#folder-structure)
10. [Architecture notes](#architecture-notes)
11. [Deployment](#deployment)
12. [Known limitations](#known-limitations)

---

## Prerequisites

- **Node.js 20+** (developed on Node 24) and npm 10+
- **PostgreSQL 14+**, or **Docker** to run the bundled Postgres container
- Optional: Google Chrome for the local Playwright run (CI downloads Chromium itself)

## Quick start

```bash
# 1. Start PostgreSQL (container on host port 5433; creates `rupeeflow` and `rupeeflow_test`)
docker compose up -d

# 2. Configure both apps
cp backend/.env.example backend/.env      # then set JWT_SECRET (see below)
cp frontend/.env.example frontend/.env

# 3. Install, generate the Prisma client, apply migrations
npm run setup

# 4. (Optional) load a demo account with 6 months of data
npm run seed          # → demo@rupeeflow.app / Demo@12345

# 5. Run the API (http://localhost:4000) and the web app (http://localhost:5173)
npm run dev:api
npm run dev:web
```

Open **http://localhost:5173** and create an account, or sign in with the demo user. New accounts start with six default categories (Food, Transport, Utilities, Entertainment, Health, Other).

> Generate a JWT secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
> The API refuses to boot if `JWT_SECRET`/`DATABASE_URL` are missing or invalid, or if production still uses the example secret.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env           # fill in values
npx prisma generate
npx prisma migrate deploy      # or `npx prisma migrate dev` while changing the schema
npm run dev                    # ts-node-dev with auto-reload on :4000
```

`GET /health` returns `{ "status": "ok" }` once the server is up.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with reload |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` (strict) / ESLint |
| `npm test` / `npm run test:coverage` | Jest suite against the test database |
| `npm run db:seed` | Recreate the demo account |

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                    # Vite on :5173, proxies /api → :4000
```

| Script | Purpose |
|---|---|
| `npm run dev` / `npm run build` / `npm run preview` | Dev server / production build / preview the build |
| `npm run typecheck` / `npm run lint` | TypeScript project build check / ESLint |
| `npm test` / `npm run test:coverage` | Vitest + React Testing Library + MSW |
| `npm run e2e` | Playwright end-to-end suite |

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://rupeeflow:rupeeflow@localhost:5433/rupeeflow?schema=public` | Postgres connection string. Tune the pool with `&connection_limit=10`. |
| `JWT_SECRET` | ✅ | *(48 random bytes, hex)* | HS256 signing secret for access tokens, at least 32 characters. |
| `NODE_ENV` | | `development` | `production` enables Secure cookies, trust-proxy and generic 500 messages. |
| `PORT` | | `4000` | HTTP port. |
| `JWT_ACCESS_EXPIRY` | | `15m` | Access-token lifetime. |
| `REFRESH_TOKEN_EXPIRY_DAYS` | | `30` | Refresh-token (session) lifetime. |
| `BCRYPT_COST` | | `12` | bcrypt work factor. |
| `FRONTEND_ORIGIN` | | `http://localhost:5173` | Exact origin(s) allowed by CORS (comma-separated). |
| `COOKIE_DOMAIN` | | *(empty)* | Refresh-cookie domain; leave empty for host-only. |
| `COOKIE_SAMESITE` | | `strict` | `strict` \| `lax` \| `none`. `none` is only for a cross-site API (forces `Secure`). |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES` | | `15` | Rate-limit window for auth routes. |
| `AUTH_RATE_LIMIT_MAX` | | `10` | Login and register attempts per window per IP. Refresh gets 6× this. |
| `LOG_REQUESTS` | | `true` | Structured JSON access logs, with secrets redacted. |
| `TEST_DATABASE_URL` | | `…/rupeeflow_test` | Database for the Jest and E2E suites. Its name must end in `_test`. |

### Frontend (`frontend/.env`)

| Variable | Example | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | API base URL. Keep `/api` whenever the host proxies to the backend (dev proxy, Vercel/Netlify rewrites). |
| `API_PROXY_TARGET` | `http://localhost:4000` | Dev-server only: where Vite forwards `/api`. |

## Database: migrations, seeding, reset

- **Schema:** [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). It has the five tables from Plan §8: `users`, `categories`, `expenses`, `budgets`, `refresh_tokens`.
- **Migrations** are committed in `backend/prisma/migrations/`. The initial migration also adds constraints that Prisma's schema language can't express:
  - the `pgcrypto` extension
  - CHECK constraints: `amount > 0`, `limit_amount > 0`, `month` 1–12, `year` 2000–2100, and hex colour
  - case-insensitive unique indexes on `lower(email)` and `(user_id, lower(name))`
- **Apply:** `npx prisma migrate deploy` in CI and production; `npx prisma migrate dev` locally when changing the schema.
- **Seeding:** each user's default categories are created **inside the registration transaction**, so no manual step is needed. `npm run db:seed` only adds the optional demo account.
- **Reset a local database:** `cd backend && npx prisma migrate reset`. This drops all data; use it on development databases only.

## Running tests

```bash
docker compose up -d                # tests need Postgres (the rupeeflow_test DB)

cd backend && npm test              # 169 Jest tests: unit + API integration against real Postgres
cd frontend && npm test             # 58 Vitest tests: components, pages, hooks, API client (MSW)
cd frontend && npm run e2e          # 9 Playwright scenarios (starts its own API :4100 + web :5174)

# Optional visual QA: every page, both themes, desktop + phone → frontend/e2e/screenshots/
cd frontend && VISUAL=1 npx playwright test --grep @visual
```

- **Backend:** the suite migrates `rupeeflow_test` with `migrate deploy` and truncates tables between tests. It refuses to run against a database whose name doesn't end in `_test`. Coverage is about 96% of statements.
- **Frontend:** tests run without a backend, using MSW handlers for every module (`src/test/msw`). Coverage is about 90% of statements.
- **E2E:** the suite runs against an isolated stack on the test database. Locally it drives the installed Chrome.

## API reference

The full contract is in [Plan §11](docs/PLAN.md#11-complete-api-specification). Base path is `/api`. Authenticated routes need `Authorization: Bearer <accessToken>`. Every error uses the same shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "amount must be greater than 0",
             "details": [{ "field": "amount", "message": "amount must be greater than 0" }] } }
```

| Method & path | Notes |
|---|---|
| `POST /auth/register` · `POST /auth/login` | → `{ user, accessToken }` and sets the `refresh_token` cookie (httpOnly, SameSite, `Path=/api/auth`) |
| `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` | Rotation with reuse detection. Logout is idempotent (204). |
| `GET/POST /categories` · `PATCH/DELETE /categories/:id` | `DELETE` **archives**. `?includeArchived=true` lists archived ones too. |
| `GET/POST /expenses` · `GET/PATCH/DELETE /expenses/:id` | Filters: `startDate endDate categoryId minAmount maxAmount search`. Sort: `sortBy=expenseDate\|amount`, `sortOrder=asc\|desc`. Paging: `page`, `limit` ≤ 100. |
| `GET/POST /budgets` · `GET/PATCH/DELETE /budgets/:id` | `?month&year&categoryId`. Rows include live `spent`, `remaining`, `percentUsed`. `PATCH` accepts only `limitAmount`. Duplicates → 409. |
| `GET /dashboard/summary?month&year` | Totals, remaining budget, per-category summary, 6-month trend |
| `GET /reports/monthly?month&year` · `GET /reports/yearly?year` | Category breakdown plus a zero-filled per-day or per-month series |
| `GET /reports/export?format=csv\|xlsx&period=monthly\|yearly&year[&month]` | Streamed download. Figures are identical to the on-screen report. |

Small additions beyond the §11 contract, all backwards-compatible:
- the `search` expense filter (the design's search box)
- `categoryColor`, `transactionCount` and `isArchived` fields for UI colour coding
- `totalBudget` / `remainingBudget` on the monthly report
- `budget` per month in the yearly report, which powers the budget-vs-actual chart

## Folder structure

```
.
├── docker-compose.yml            Postgres 16 (+ test database)
├── render.yaml                   Render blueprint (API + managed Postgres)
├── .github/workflows/ci.yml      typecheck · lint · tests · builds · E2E
├── docs/                         PLAN.md (project plan) · AUDIT.md (traceability + checklist)
├── ui/                           Original light/dark design references
├── backend/
│   ├── prisma/                   schema.prisma · migrations/ · seed.ts
│   ├── src/
│   │   ├── config/               env.ts (Zod-validated env) · db.ts (Prisma singleton)
│   │   ├── middleware/           authenticate · validate · rateLimiter · requestLogger · errorHandler
│   │   ├── modules/<module>/     *.routes · *.controller · *.service · *.repository · *.validation · *.types · *.test
│   │   │     auth · categories · expenses · budgets · dashboard · reports
│   │   ├── utils/                hash · tokens · money · dates · export · validators · logger · errors
│   │   ├── app.ts                middleware chain + routers
│   │   └── server.ts             listen + graceful shutdown
│   └── tests/                    Jest global setup + helpers
└── frontend/
    ├── e2e/                      Playwright scenarios + visual capture
    └── src/
        ├── api/                  Axios client (silent refresh) · DTO types
        ├── context/              Auth · Theme · Period · Toast
        ├── features/<module>/    typed TanStack Query hooks + feature components (forms, filter bar)
        ├── components/           ui/ (Button, Modal, ConfirmDialog, Pagination, …) · layout/ · charts/
        ├── pages/                Login · Register · Dashboard · Expenses · Budgets · Categories · Reports
        ├── lib/                  formatting, dates, budget status, query client
        └── test/                 Vitest setup · MSW handlers
```

## Architecture notes

- **Layering (Plan §12):** routes → controller → service → repository → Prisma. Only `*.repository.ts` may import Prisma Client, and an ESLint rule enforces it. Every repository method takes `userId` and scopes its `WHERE` clause with it, so another user's row answers **404, never 403**.
- **Money math is in SQL (Plan §17/§18):** the dashboard, budgets, reports and exports all use `SUM`/`GROUP BY` queries in `expenses.repository.ts` and `budgets.repository.ts`. The browser never sums raw expense rows. Date filters are sargable ranges (`expense_date >= $start AND < $end`), so the `(user_id, expense_date)` index is used.
- **Transactions (A7):**
  - registration and its default categories
  - refresh-token rotation (a conditional update prevents double rotation)
  - budget check-and-insert, backed by the `(user_id, category_id, month, year)` unique constraint, which returns 409
- **Auth (Plan §10):**
  - Access tokens are 15-minute HS256 JWTs with the algorithm pinned, held only in memory in the SPA.
  - Refresh tokens are 256-bit opaque values stored as SHA-256 hashes.
  - Each refresh rotates the token; reusing an old one revokes the whole session family.
  - The SPA de-duplicates concurrent refreshes, so N parallel 401s trigger one refresh.
- **Frontend state (Plan §13):** TanStack Query owns server state. Expense mutations invalidate expenses, budgets, dashboard and reports together. Expense deletes are optimistic and roll back on failure. Charts are lazy-loaded behind an error boundary, so they never block the numeric summary.
- **Design:** light theme = SpendWise identity (`ui/light`), dark theme = RupeeFlow design system (`ui/dark`). Both map to the same semantic Tailwind tokens (`src/index.css`), so every screen works in both themes. The theme toggle is in the top bar.

## Deployment

The recommended setup is Render (API + managed Postgres) with Vercel or Netlify for the SPA. Steps from Plan §28:

1. **Database + API:** push the repo and create a Render Blueprint from [`render.yaml`](render.yaml). It provisions Postgres, builds [`backend/Dockerfile`](backend/Dockerfile), generates `JWT_SECRET`, and the container runs `prisma migrate deploy` before starting. Check `GET /health`.
2. **Frontend:** deploy `frontend/` to Vercel ([`vercel.json`](frontend/vercel.json)) or Netlify ([`netlify.toml`](frontend/netlify.toml)). First replace `rupeeflow-api.onrender.com` in the rewrite with your API host. Keep `VITE_API_URL=/api`.
3. **CORS:** set the API's `FRONTEND_ORIGIN` to the deployed frontend URL.
4. **Smoke test:** register → add an expense → check the dashboard total → export a report.

**Refresh cookie in production:** the frontend host **proxies `/api` to the backend**, so the browser sees the API as first-party and `SameSite=Strict` keeps working. If you instead point `VITE_API_URL` at the API domain directly (a cross-site call), set `COOKIE_SAMESITE=none`. The API then sends `Secure; SameSite=None`, which browsers require for a cross-site cookie. This avoids the classic "login works locally but not in prod" bug.

## Known limitations

- **Single currency (INR), English only**, and no tablet-specific layout; the assignment asks only for mobile and desktop.
- **Reports are generated synchronously** and streamed. That fits personal-finance data volumes (Plan §18); a job queue would be needed for multi-user analytics.
- **Deleting a category archives it.** History stays valid, and it can be unarchived.
- **Budgets don't block spending.** An expense that exceeds a budget is still saved and flagged as over budget.
- **No stored procedures (optional A10).** The aggregation SQL lives in version-controlled, tested repository code (Plan §21).
- **Two tabs refreshing at the same moment** can trip refresh-token reuse detection and sign both out. This is a deliberate security trade-off (Plan §10); within one tab, refreshes are de-duplicated.
- **Not implemented because out of scope (Plan §3):** password reset, OAuth, recurring expenses, notifications.

## License

MIT (assignment submission).
