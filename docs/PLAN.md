> Source: the approved project plan (original HTML kept alongside as `PLAN.html`).

# Expense Tracker & Budget Management System — Implementation-Ready Project Plan

**Scope of this document:** Project 1 only ("Expense Tracker and Budget Management System") from the Earnest Data Analytics Full Stack Developer Assignment. Project 2 ("Task Management System") is explicitly excluded, per instruction.

## 1. Executive Summary

This plan turns the assignment brief into a buildable engineering package: a personal finance web application where a user registers, logs in, records expenses against custom categories, sets monthly per-category budget limits, and reviews spend through a dashboard and downloadable reports.

The system is a standard three-tier web app: a React + TypeScript SPA, a Node.js + Express + TypeScript REST API, and a PostgreSQL relational database accessed through Prisma ORM. Authentication uses short-lived JWT access tokens plus a rotating, DB-backed refresh token delivered as an httpOnly cookie. All money math (totals, remaining budget, category summaries, reports) is computed in SQL, not pulled to the browser and summed in JavaScript — this is the single biggest correctness/performance decision in the system and is referenced repeatedly below.

The plan is organized so a developer can start from an empty repository and execute it phase by phase (Section 23), task by task (Section 24), with every assignment line item traced to a concrete deliverable (Section 26) and checked off at the end (Section 31).

## 2. Assignment Requirement Breakdown

Every line from the assignment, classified as **R** = Required (explicitly stated), **REC** = Recommended (not explicit, but needed for a credible submission), or **OPT** = Optional (assignment says "optional").

| # | Requirement (as written in assignment) | Class |
|---|---|---|
| F1 | Login and registration pages | R |
| F2 | Dashboard: total expenses, remaining budget, category summary | R |
| F3 | Add / edit / delete expense | R |
| F4 | Filter expenses by date, category, amount | R |
| F5 | Set monthly budget limits per category | R |
| F6 | Edit / delete budget limits | R |
| F7 | Monthly and yearly expense reports | R |
| F8 | CSV or Excel report export | R |
| F9 | Charts/graphs visualization | OPT |
| F10 | Responsive design, mobile + desktop (tablet not required) | R |
| B1 | JWT-based authentication | R |
| B2 | Registration and login endpoints | R |
| B3 | Refresh token mechanism for persistent sessions | R |
| B4 | CRUD endpoints for expenses | R |
| B5 | CRUD endpoints for budgets | R |
| B6 | SQL schema: users, expenses, budgets | R |
| B7 | Relational DB (PostgreSQL/MySQL) | R |
| A1 | React Hooks used effectively | R |
| A2 | TypeScript interfaces/types for props and state | R |
| A3 | Charting library integration | OPT (tied to F9) |
| A4 | Request validation and error handling (backend) | R |
| A5 | TypeScript on backend | R |
| A6 | Environment variables for configuration | R |
| A7 | Transactions where necessary | R |
| A8 | Query optimization | R |
| A9 | Indexing for faster retrieval | OPT (assignment marks this optional) |
| A10 | Stored procedures for complex queries | OPT |
| T1 | Unit tests, frontend and backend | OPT, but explicitly "has weightage when evaluating" → treated as **REC** in this plan |
| D1 | Deployment (Heroku/Vercel/Netlify) | OPT |
| D2 | Source code, both frontend and backend | R (deliverable) |
| D3 | README with setup instructions | R (deliverable) |
| D4 | Deployed application URL | OPT |

Not stated anywhere but structurally required to satisfy F2/F4/F5/B5 (categorizing expenses, per-category budgets, category summary) is a **Category** entity and its minimal CRUD. This is flagged again in Sections 3, 7 and 30 as an engineering decision, not an assignment requirement — it exists only because the stated requirements cannot be met without it.

Indexing (A9) and stored procedures (A10) are marked optional by the assignment itself, but this plan implements a baseline index set anyway (Section 8/21) because without it, F4 (filtering) and F2/F7 (aggregation) will not perform acceptably even at moderate data volume — this is called out explicitly as "required for correctness of experience, optional in the assignment's letter."

## 3. Scope

**Objective.** Let an individual user track personal spending against self-defined monthly budgets, categorized, with historical reporting.

**Problem being solved.** Manual expense tracking (spreadsheets, notes apps) has no budget-vs-actual visibility and no structured reporting. This app gives a single place to log spend, cap it per category per month, and see where money went.

**Target users.** Single individual, self-service, multi-tenant at the data layer (many users, each seeing only their own data) — not shared/family accounts, not multi-currency, not business/accounting-grade.

**Core user journeys**

- Register → auto-logged in → land on Dashboard (empty state).
- Create a few categories (or use seeded defaults) → log expenses against them.
- Set a monthly budget per category → Dashboard shows spend vs. limit.
- Filter/search expense history by date range, category, amount range.
- Open Reports → pick month or year → view aggregated numbers → download CSV/Excel.
- Return days later → session persists via refresh token, no re-login needed.
- Edit/delete a past expense or budget; totals recompute automatically.

**Functional scope:** auth (register/login/refresh/logout), category CRUD (minimal), expense CRUD + filtering + pagination, budget CRUD, dashboard summary, monthly/yearly reports with CSV/Excel export, optional charts.

**Non-functional scope:** responsive (mobile + desktop only), input validation client+server, authorization isolation between users, indexed/aggregated queries so dashboard and reports don't degrade as expense count grows, environment-based configuration, automated tests with meaningful coverage of business logic and auth.

**In-scope**

- Single currency, no currency conversion.
- Single relational DB, single active schema version at a time (no multi-tenancy beyond row-level `user_id` scoping).
- Web only (desktop browser + mobile browser, responsive layout).
- Category is per-user (not shared/global taxonomy).

**Explicitly out-of-scope**

- Tablet-specific breakpoints (assignment: "tablet not required").
- Multi-currency, multi-language (i18n).
- Shared/family budgets, multi-user collaboration on one budget.
- Recurring/scheduled expenses, bank account integration/import.
- Push notifications or budget-exceeded alerts (not requested).
- Native mobile app (responsive web only).
- Background job infrastructure (queues/workers) — justified in Section 18 given expected data volume.

**MVP scope (must exist to call the assignment "done"):** F1–F8, F10, B1–B7, A1–A8, D2–D3 from Section 2's table.

**Production-quality enhancements (raise the ceiling, don't block completion):** F9 charts, A9 indexing (built anyway, see above), A10 stored procedures, T1 automated tests, D1/D4 deployment, rate limiting, refresh-token reuse detection, structured logging.

**Required vs. Recommended vs. Optional, restated as build priority**

| Tier | Contents | Consequence if skipped |
|---|---|---|
| Tier 1 — Required | All "R" rows in Section 2 | Assignment is incomplete/non-compliant |
| Tier 2 — Recommended | Category CRUD, indexing, tests, basic security hardening (rate limiting, CORS, helmet) | Technically "meets the letter" but would read as a weak, unhardened submission |
| Tier 3 — Optional | Charts, stored procedures, deployment, background jobs | Nice-to-have; explicitly called optional by the assignment |

Tier 3 items are never allowed to consume time that Tier 1 items need — this ordering is enforced by the phase plan in Section 23 (Tier 3 work is pushed to Phases 10–13, after every Tier 1 item is functionally complete).

## 4. Technology Stack

**Frontend**

| Concern | Choice | Why (evaluated against assignment) |
|---|---|---|
| Framework | React 18 + TypeScript | Explicit requirement (A2 needs TS interfaces/props/state) |
| Build tool | Vite | Fast dev server/HMR, native TS support, no CRA maintenance burden |
| Routing | React Router v6 | Standard, supports protected-route patterns needed for auth gating |
| Server state | TanStack Query | Assignment doesn't name it, but expense/budget/report data is server-owned; manual `useEffect` fetch+loading+error+cache handling would violate "use Hooks effectively" by reinventing what a hook library solves — chosen specifically to satisfy A1 well, not just technically |
| Forms | React Hook Form + Zod | Type-safe form state (A2) with schema validation shared in spirit with backend Zod schemas (A4) |
| HTTP client | Axios | Interceptor support is used for the silent-refresh flow (Section 13); Fetch would need this hand-rolled |
| Charts (optional, F9) | Recharts | Declarative, composable with React, sufficient for line/bar/pie budget-vs-actual visuals |
| Styling | Tailwind CSS | Utility classes make the two required breakpoints (mobile/desktop, Section 14) fast to implement consistently |
| Dates | date-fns | Lightweight, avoids Moment's bundle cost, needed for month/year boundary logic on both FE display and any client-side formatting |

**Backend**

| Concern | Choice | Why |
|---|---|---|
| Runtime/framework | Node.js + Express + TypeScript | Explicit requirement |
| ORM | Prisma | Assignment names Sequelize/TypeORM as examples, not mandates. Prisma is chosen over both: generates types directly from the schema (reduces drift between DB and TS types, strengthening A5), has first-class migration tooling (needed for A7 transactions via `prisma.$transaction`, and for the migration strategy in Section 8), and parameterizes all queries by default (closes the SQL-injection line item in Section 20). This is a deliberate deviation from the "such as" list and is called out here, not silently swapped. |
| Validation | Zod | Same library family used on the frontend forms — one mental model for "what does valid input look like," reduces duplicated validation logic (A4) |
| Auth tokens | jsonwebtoken (access) + crypto.randomBytes (refresh) | Standard, well-audited; refresh token is intentionally not a JWT — see Section 10 |
| Password hashing | bcrypt (cost factor 12) | Industry default for this workload size |
| CSV export | fast-csv | Streams rows instead of building one giant string in memory |
| Excel export | exceljs | Streaming workbook writer, avoids loading a full XLSX in memory |
| Security middleware | helmet, cors, express-rate-limit, cookie-parser | Closes concrete items in Section 20's checklist |
| Testing | Jest + Supertest | Standard pairing for Express API integration tests |
| Dev tooling | ts-node-dev, dotenv, eslint, prettier | Fast reload in dev, env var loading (A6), consistent style |

**Database**

| Concern | Choice | Why |
|---|---|---|
| Engine | PostgreSQL | Chosen over MySQL for three concrete reasons tied to this assignment's requirements, not generic preference: (1) native `NUMERIC` + robust `CHECK` constraints for money (A7/A8 correctness), (2) window functions (`SUM() OVER`, `date_trunc`) make the monthly/yearly report aggregation (Section 18) and dashboard rollups (Section 17) simpler and more indexable than MySQL equivalents, (3) native UUID generation via `pgcrypto`/`gen_random_uuid()` supports the ID strategy in Section 8 without an extra library. |
| ID strategy | UUID v4 | See Section 8 |
| Migrations | Prisma Migrate | Versioned, repo-committed SQL migrations |

## 5. System Architecture

End-to-end request path, every layer named:

```
User (browser/mobile browser)
  │
  ▼
React SPA (pages/components, React Hooks for local UI state)
  │  TanStack Query (server-state cache) + React Hook Form (form state)
  ▼
API client (Axios instance, baseURL, request/response interceptors)
  │  - attaches Authorization: Bearer <accessToken>
  │  - on 401, pauses queue, calls /auth/refresh, retries original request
  ▼
HTTP/REST over HTTPS (JSON bodies)
  ▼
Express app (app.ts)
  │  Middleware chain (in order):
  │    1. helmet (security headers)
  │    2. cors (whitelisted origin, credentials: true)
  │    3. cookie-parser (reads refresh_token cookie)
  │    4. express.json() (body parsing)
  │    5. rate-limiter (auth routes only)
  │    6. request logger
  │    7. authenticate (verifies JWT, attaches req.user) — skipped for /auth/register,/auth/login,/auth/refresh
  ▼
Router (per module: auth, categories, expenses, budgets, dashboard, reports)
  ▼
Controller (parses req, calls Zod schema, calls service, shapes HTTP response — no business logic, no SQL)
  ▼
Service (business rules: ownership checks, budget-duplicate checks, aggregation orchestration, calls repository)
  ▼
Repository (the only layer that imports Prisma Client; every query filtered by user_id)
  ▼
Prisma Client → PostgreSQL (parameterized SQL, indexes, constraints, transactions)
  ▼
Response bubbles back up: repository returns typed rows → service shapes DTO → controller sends JSON → Axios resolves → TanStack Query updates cache → React re-renders
```

**Component architecture.** Six backend modules (auth, categories, expenses, budgets, dashboard, reports) each own their full vertical slice (routes→controller→service→repository→types→tests). Frontend mirrors this with one feature folder per module, each exposing a typed hook (`useExpenses`, `useBudgets`, etc.) as its public API to pages.

**Frontend architecture** — detailed in Section 13. **Backend architecture** — detailed in Section 12. **Database architecture** — detailed in Section 8. **Authentication architecture** — detailed in Section 10. **Reporting architecture** — detailed in Section 18. **Deployment architecture** — detailed in Section 28.

## 6. Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────────┐  │
│  │  React Pages   │──▶│ TanStack Query │──▶│  Axios instance    │  │
│  │ Login/Register │   │  (server state)│   │ (JWT header +      │  │
│  │ Dashboard      │◀──│  RHF+Zod forms │◀──│  refresh interceptor)│ │
│  │ Expenses       │   └───────────────┘   └─────────┬─────────┘  │
│  │ Budgets        │                                  │            │
│  │ Reports        │                                  │            │
│  └───────────────┘                                  │            │
└──────────────────────────────────────────────────────┼────────────┘
                                                         │ HTTPS/JSON
                                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Node/Express)                       │
│  helmet → cors → cookie-parser → json → rate-limit → auth mw     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Routers: /auth /categories /expenses /budgets /dashboard    │ │
│  │           /reports                                           │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                           ▼                                       │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────────┐  │
│  │  Controllers   │──▶│   Services     │──▶│   Repositories     │  │
│  │ (HTTP shaping) │   │ (business rules│   │ (Prisma queries,   │  │
│  │                │◀──│  ownership)    │◀──│  user_id scoped)   │  │
│  └───────────────┘   └───────────────┘   └─────────┬─────────┘  │
└──────────────────────────────────────────────────────┼────────────┘
                                                         │ Prisma Client
                                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (indexed, constrained)              │
│   users │ categories │ expenses │ budgets │ refresh_tokens        │
└─────────────────────────────────────────────────────────────────┘
```

## 7. Domain Model

**Entities:** User, Category, Expense, Budget, RefreshToken.

**Engineering decision — Category as a first-class entity.** The assignment never names a "Category" CRUD section, but F2 ("category summary"), F4 ("filter by category"), F5 ("budget limits for different categories") and B5's implied budget-category link cannot be built against a free-text string without losing referential integrity (typos would silently split one category into two, budgets couldn't reliably reference "the same" category as expenses). Category is therefore modeled as a real table, owned per-user, with minimal CRUD (Section 11). This is called out again in Sections 3 and 30 as an inference required to satisfy stated requirements, not an assignment requirement in itself.

**Relationships**

| Relationship | Cardinality | Ownership rule |
|---|---|---|
| User → Category | 1 : N | Category always belongs to exactly one user |
| User → Expense | 1 : N | Expense always belongs to exactly one user |
| User → Budget | 1 : N | Budget always belongs to exactly one user |
| User → RefreshToken | 1 : N | One row per issued session/token family |
| Category → Expense | 1 : N | An expense must reference a category owned by the same user |
| Category → Budget | 1 : N | A budget must reference a category owned by the same user |

**Referential integrity / delete behavior**

| Parent | Child | On parent delete |
|---|---|---|
| User | Category, Expense, Budget, RefreshToken | `ON DELETE CASCADE` — deleting a user (account deletion, out of scope for UI but modeled for integrity) removes all owned data |
| Category | Expense | **No hard delete of a category that has expenses.** Category delete is a soft delete (`is_archived = true`); archived categories are hidden from "create new expense" pickers but historical expenses keep a valid reference and still display their category name. This is an engineering decision (assignment doesn't specify category-deletion behavior) — flagged in Section 30. |
| Category | Budget | Same soft-delete rule: archiving a category does not delete its budgets; the dashboard simply stops offering new budgets against an archived category. |

**Uniqueness constraints**

- `users.email` — unique (case-insensitive, enforced via a unique index on `lower(email)`).
- `(categories.user_id, lower(categories.name))` — unique; a user cannot have two categories named "Food" and "food".
- `(budgets.user_id, budgets.category_id, budgets.month, budgets.year)` — unique; prevents duplicate budgets for the same category/month/year (explicit assignment concern in Section 4 of the brief: "how duplicate budgets are prevented").

**Validation constraints (enforced at both Zod layer and DB layer — defense in depth, Section 19)**

- `expenses.amount > 0`, `budgets.limit_amount > 0`.
- `budgets.month` ∈ [1,12], `budgets.year` ∈ [2000,2100] (sane bound, not a business rule).
- `expenses.expense_date` is a valid calendar date, not in the far future (soft client-side warning, not a hard DB constraint, since backdating past expenses is legitimate but far-future dates likely indicate a UI bug).
- `categories.name` length 1–50, `expenses.description` length 0–255.

## 8. Database Schema

**Design notes referenced by the tables below**

- **IDs: UUID v4** (`gen_random_uuid()`, via the `pgcrypto` extension). Chosen over auto-increment integers specifically because this assignment's security section requires proving "User A cannot access User B's data" (Section 10/20) — sequential integer IDs let a client enumerate `/expenses/1`, `/expenses/2`... to probe for other users' records even if the authorization check ultimately blocks them; UUIDs remove that reconnaissance vector and avoid leaking row counts (e.g., "how many total expenses exist in the system").
- **Currency/amount representation:** `NUMERIC(12,2)`, never `FLOAT`/`DOUBLE` — floating point cannot represent currency exactly (e.g., 0.1 + 0.2 problem) and this assignment's own "advanced concepts" section asks for correct, optimized data handling. `NUMERIC(12,2)` supports values up to 9,999,999,999.99, far beyond any personal-finance figure.
- **Date/time representation:** `expense_date` is a plain `DATE` (a calendar day, no timezone concept — an expense happens "on a date," not at an instant). `created_at`/`updated_at` audit columns are `TIMESTAMPTZ`, stored in UTC, converted to the user's local time only in the UI. This split avoids the classic bug where a `TIMESTAMPTZ` expense date shifts to the previous/next day depending on the server's or browser's timezone.
- **Monthly budget representation:** `month SMALLINT` + `year SMALLINT`, not a `DATE` set to the 1st of the month — a budget isn't "on a day," it's a scope; storing it as two small integers makes the uniqueness constraint and the month/year filter (B5 requirement) a direct equality match instead of a date-range comparison.
- **How historical expenses remain valid:** categories are soft-deleted (archived), never hard-deleted while referenced — see Section 7. This guarantees `expenses.category_id` and `budgets.category_id` are never dangling.
- **How categories relate to expenses/budgets:** both `expenses` and `budgets` hold a `category_id` foreign key; a category groups N expenses and (at most one per month/year) N budgets over time.
- **How duplicate budgets are prevented:** composite unique constraint `(user_id, category_id, month, year)` — a second insert attempt for the same tuple is rejected at the DB level even if application logic has a bug, and the service layer catches the unique-violation error and returns `409 Conflict` (Section 15).

**`users`**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE (on `lower(email)`) |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, default `now()`, updated on write |

**`categories`**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| user_id | UUID | NOT NULL, FK → users.id, `ON DELETE CASCADE` |
| name | VARCHAR(50) | NOT NULL |
| color | VARCHAR(7) | NULL (hex code, for chart/UI color coding) |
| is_archived | BOOLEAN | NOT NULL, default `false` |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| — | — | UNIQUE (user_id, lower(name)) |

**`expenses`**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| user_id | UUID | NOT NULL, FK → users.id, `ON DELETE CASCADE` |
| category_id | UUID | NOT NULL, FK → categories.id, `ON DELETE RESTRICT` |
| amount | NUMERIC(12,2) | NOT NULL, CHECK (amount > 0) |
| description | VARCHAR(255) | NULL |
| expense_date | DATE | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, default `now()` |

**`budgets`**

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| user_id | UUID | NOT NULL, FK → users.id, `ON DELETE CASCADE` |
| category_id | UUID | NOT NULL, FK → categories.id, `ON DELETE CASCADE` |
| month | SMALLINT | NOT NULL, CHECK (month BETWEEN 1 AND 12) |
| year | SMALLINT | NOT NULL, CHECK (year BETWEEN 2000 AND 2100) |
| limit_amount | NUMERIC(12,2) | NOT NULL, CHECK (limit_amount > 0) |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| — | — | UNIQUE (user_id, category_id, month, year) |

**`refresh_tokens`** (supports B3 — not explicitly asked for as a table, but a refresh mechanism cannot be revocable/rotatable without server-side state)

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| user_id | UUID | NOT NULL, FK → users.id, `ON DELETE CASCADE` |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE (SHA-256 hash of the raw token; raw token never stored) |
| expires_at | TIMESTAMPTZ | NOT NULL |
| revoked_at | TIMESTAMPTZ | NULL |
| replaced_by_hash | VARCHAR(255) | NULL (links rotation chain, enables reuse detection) |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |

**Prisma schema (directly convertible to migrations)**

```
model User {
  id            String    @id @default(uuid())
  name          String    @db.VarChar(100)
  email         String    @unique @db.VarChar(255)
  passwordHash  String    @map("password_hash") @db.VarChar(255)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  categories    Category[]
  expenses      Expense[]
  budgets       Budget[]
  refreshTokens RefreshToken[]
  @@map("users")
}

model Category {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  name       String    @db.VarChar(50)
  color      String?   @db.VarChar(7)
  isArchived Boolean   @default(false) @map("is_archived")
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses   Expense[]
  budgets    Budget[]
  @@unique([userId, name])
  @@map("categories")
}

model Expense {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  categoryId  String   @map("category_id")
  amount      Decimal  @db.Decimal(12, 2)
  description String?  @db.VarChar(255)
  expenseDate DateTime @map("expense_date") @db.Date
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  @@index([userId, expenseDate])
  @@index([userId, categoryId])
  @@map("expenses")
}

model Budget {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  categoryId  String   @map("category_id")
  month       Int      @db.SmallInt
  year        Int      @db.SmallInt
  limitAmount Decimal  @map("limit_amount") @db.Decimal(12, 2)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@unique([userId, categoryId, month, year])
  @@index([userId, year, month])
  @@map("budgets")
}

model RefreshToken {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  tokenHash       String    @unique @map("token_hash")
  expiresAt       DateTime  @map("expires_at")
  revokedAt       DateTime? @map("revoked_at")
  replacedByHash  String?   @map("replaced_by_hash")
  createdAt       DateTime  @default(now()) @map("created_at")
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("refresh_tokens")
}
```

**Index strategy (summary — full list in Section 21):** `(user_id, expense_date)` and `(user_id, category_id)` on `expenses` for filtering (F4) and category rollups (F2); `(user_id, year, month)` on `budgets` for dashboard/report lookups; unique indexes double as lookup indexes for the uniqueness checks above.

**Query optimization strategy:** all list/aggregate endpoints filter by `user_id` first (leading column of every composite index), aggregation (`SUM`, `GROUP BY`) happens in PostgreSQL, never in application code over a fully-fetched row set (Section 17).

**Transaction strategy** — where `A7 "transactions where necessary"` actually applies:

| Operation | Transactional? | Why |
|---|---|---|
| Registration (insert user + seed default categories) | **Yes** | Partial failure would leave a user with no categories, breaking the first expense-creation screen |
| Refresh token rotation (revoke old + insert new) | **Yes** | Partial failure could leave two valid tokens (security bug) or zero valid tokens (user logged out unexpectedly) |
| Budget create (check-duplicate + insert) | **Yes**, via `prisma.$transaction` or relying on the unique constraint + catching `P2002` | Race condition: two rapid clicks could both pass an app-level "does it exist" check before either insert commits |
| Category archive (set is_archived + no other writes) | No | Single-row update, atomic by default |
| Expense create/update/delete | No | Single-row write; correctness comes from constraints, not multi-statement atomicity |

**Migration strategy:** Prisma Migrate (`prisma migrate dev` locally, `prisma migrate deploy` in CI/CD), migration SQL files committed to `prisma/migrations/`, one migration per schema change, never edited after being applied to a shared environment.

**Seed-data strategy:** a seed script (`prisma/seed.ts`) creates default categories (Food, Transport, Utilities, Entertainment, Health, Other) for a newly registered user, run inside the same transaction as user creation — not a separate manual step.

## 9. ER Diagram (ASCII)

```
┌───────────────┐
│     User      │
│───────────────│
│ id (PK)       │
│ name          │
│ email  (UQ)   │
│ password_hash │
└──────┬────────┘
       │ 1
       │
       │ N                N                 1
┌──────┴────────┐  ┌───────────────┐  ┌──────┴────────┐
│  RefreshToken │  │   Category    │──│    (self)     │
│───────────────│  │───────────────│  └───────────────┘
│ id (PK)       │  │ id (PK)       │
│ user_id (FK)  │  │ user_id (FK)  │
│ token_hash(UQ)│  │ name          │
│ expires_at    │  │ is_archived   │
│ revoked_at    │  │ UQ(user,name) │
└───────────────┘  └───┬───────┬───┘
                        │1      │1
                        │N      │N
                 ┌──────┴──┐ ┌──┴────────┐
                 │ Expense │ │  Budget   │
                 │─────────│ │───────────│
                 │id (PK)  │ │id (PK)    │
                 │user_id  │ │user_id    │
                 │category_id│category_id│
                 │amount   │ │month,year │
                 │expense_date│limit_amount│
                 │         │ │UQ(user,cat,mo,yr)│
                 └─────────┘ └───────────┘
```

## 10. Authentication & Authorization Architecture

**Access token:** JWT (HS256), payload `{ sub: userId, iat, exp }`, **15-minute** lifetime, sent as `Authorization: Bearer <token>` header, held only in memory on the frontend (a React context / query client, never `localStorage`) to limit the blast radius of an XSS bug — this is a defense-in-depth choice, not a claim that the app has no other XSS risk.

**Refresh token:** an opaque, cryptographically random 256-bit value (`crypto.randomBytes(32).toString('hex')`) — deliberately **not** a JWT, because revocation of a JWT before its expiry requires a server-side blocklist anyway, so there is no benefit to the JWT format for this token and a plain random value is simpler to hash/compare. Lifetime **30 days**. Delivered as an **httpOnly, Secure, SameSite=Strict** cookie, `path=/api/auth`, so it is never readable by JavaScript and is only ever sent to the refresh/logout endpoints (reducing CSRF surface — see Section 20). Only the SHA-256 hash of the token is stored in `refresh_tokens.token_hash`; a leaked database does not hand out usable tokens.

**Registration flow:** validate body (Zod: name, email format, password ≥ 8 chars) → check email uniqueness → `bcrypt.hash(password, 12)` → transaction: insert `users` row + seed default `categories` → issue access token + refresh token (same as login) → respond `201` with user profile (no password hash) and set refresh cookie.

**Login flow:** validate body → look up user by email → `bcrypt.compare` → on success, issue access token (signed, 15 min) → generate refresh token, hash it, insert `refresh_tokens` row (expires_at = now + 30d) → set httpOnly cookie → respond `200` with access token in JSON body + user profile.

**Refresh flow:** read `refresh_token` cookie → hash it → look up `refresh_tokens` row by hash → checks, in order:

- Row exists → else `401`.
- `revoked_at IS NULL` → if already revoked, **this is a reuse signal**: revoke every other non-revoked token for that `user_id` (kill the whole session family) and respond `401` — this defends against a stolen refresh token being used after the legitimate client already rotated past it.
- `expires_at > now()` → else `401`.
- All pass → **rotate**: mark current row `revoked_at = now()`, generate a new refresh token, insert new row, set `replaced_by_hash` on the old row to the new row's hash, issue a new 15-minute access token. All of this happens inside one DB transaction (Section 8).
- Respond `200` with new access token; set new refresh cookie.

**Logout flow:** read refresh cookie → hash it → set `revoked_at = now()` on the matching row → clear the cookie (`Set-Cookie` with `Max-Age=0`).

**Middleware**

- `authenticate`: reads `Authorization: Bearer`, verifies JWT signature + expiry, attaches `req.user = { id }`. Missing/invalid/expired → `401`.
- Authorization is **not** a separate role-check middleware here (no admin/user roles in scope) — it is enforced structurally: every repository method that touches `expenses`/`budgets`/`categories` takes `userId` as a mandatory first argument and includes it in the `WHERE` clause. There is no code path that can query another user's row, because no repository method accepts a bare `id` without a `userId`.

**How the system prevents specific attacks**

| Threat | Prevention |
|---|---|
| User A reads/edits/deletes User B's expense or budget | Every repository query is `WHERE id = :id AND user_id = :currentUserId`; a mismatched ID returns "not found" (404), never "forbidden" (403), so existence of other users' records isn't leaked |
| Refresh token reuse (stolen cookie replayed after rotation) | Reuse-detection in step 2 above revokes the entire token family |
| Expired/invalid access token | `authenticate` middleware rejects with `401`; frontend Axios interceptor catches exactly this and attempts one silent refresh before giving up |
| Invalid/expired/tampered refresh token | Refresh endpoint rejects with `401`, frontend redirects to `/login` |
| Brute-force login attempts | `express-rate-limit` on `/auth/login` and `/auth/register` (e.g., 10 requests / 15 min / IP) |

## 11. Complete API Specification

Base path: `/api`. All authenticated routes require `Authorization: Bearer <accessToken>` unless noted. All error responses use the shape defined in Section 19.

### AUTH

| **POST /auth/register** | Create a user account |
|---|---|
| Auth required | No |
| Body | `{ name: string, email: string, password: string }` |
| Validation | name 1–100 chars; email valid format; password ≥ 8 chars, ≥1 letter + ≥1 number |
| Success | `201` `{ user: { id, name, email }, accessToken }` + sets refresh cookie |
| Errors | `400` validation failed; `409` email already registered |

| **POST /auth/login** | Authenticate and start a session |
|---|---|
| Auth required | No |
| Body | `{ email: string, password: string }` |
| Validation | email format; password non-empty |
| Success | `200` `{ user: { id, name, email }, accessToken }` + sets refresh cookie |
| Errors | `400` validation; `401` invalid credentials (generic message — does not reveal whether email exists) |

| **POST /auth/refresh** | Rotate refresh token, issue new access token |
|---|---|
| Auth required | No (uses refresh cookie instead) |
| Body | none |
| Success | `200` `{ accessToken }` + sets new refresh cookie |
| Errors | `401` missing/invalid/expired/revoked/reused refresh token |

| **POST /auth/logout** | End the current session |
|---|---|
| Auth required | No (uses refresh cookie) |
| Success | `204` no body, clears cookie |
| Errors | none meaningful — logout is idempotent |

| **GET /auth/me** | Return the current authenticated user |
|---|---|
| Auth required | Yes |
| Success | `200` `{ id, name, email, createdAt }` |
| Errors | `401` not authenticated |

### CATEGORIES

| **GET /categories** | List the user's categories |
|---|---|
| Auth required | Yes |
| Query params | `includeArchived?: boolean` (default false) |
| Success | `200` `[{ id, name, color, isArchived }]` |

| **POST /categories** | Create a category |
|---|---|
| Auth required | Yes |
| Body | `{ name: string, color?: string }` |
| Validation | name 1–50 chars, unique per user (case-insensitive); color, if present, is a `#RRGGBB` hex string |
| Success | `201` created category |
| Errors | `400` validation; `409` duplicate name |

| **PATCH /categories/:id** | Rename / recolor / archive a category |
|---|---|
| Auth required | Yes |
| Body | `{ name?: string, color?: string, isArchived?: boolean }` |
| Success | `200` updated category |
| Errors | `400` validation; `404` not found / not owned; `409` new name collides with another category |

| **DELETE /categories/:id** | Archive a category (soft delete) |
|---|---|
| Auth required | Yes |
| Success | `204` — implemented as `isArchived = true`, never a hard delete while referenced (Section 7) |
| Errors | `404` not found / not owned |

### EXPENSES

| **POST /expenses** | Create an expense |
|---|---|
| Auth required | Yes |
| Body | `{ categoryId: string(uuid), amount: number, description?: string, expenseDate: string(YYYY-MM-DD) }` |
| Validation | amount > 0; categoryId must belong to the caller and not be archived; expenseDate valid date |
| Success | `201` created expense (with embedded category `{ id, name, color }`) |
| Errors | `400` validation; `404` categoryId not found/not owned |

| **GET /expenses** | List expenses, filtered/paginated/sorted |
|---|---|
| Auth required | Yes |
| Query params | `startDate?, endDate?` (YYYY-MM-DD), `categoryId?`, `minAmount?, maxAmount?`, `page?` (default 1), `limit?` (default 20, max 100), `sortBy?` (`expenseDate |
| Validation | filters combine with AND; minAmount ≤ maxAmount; startDate ≤ endDate |
| Success | `200` `{ data: Expense[], meta: { page, limit, total, totalPages } }` |
| Errors | `400` invalid filter combination |

| **GET /expenses/:id** | Get one expense |
|---|---|
| Auth required | Yes |
| Success | `200` expense |
| Errors | `404` not found/not owned |

| **PATCH /expenses/:id** | Update an expense |
|---|---|
| Auth required | Yes |
| Body | any subset of `{ categoryId, amount, description, expenseDate }` |
| Success | `200` updated expense |
| Errors | `400` validation; `404` expense or new categoryId not found/not owned |

| **DELETE /expenses/:id** | Delete an expense |
|---|---|
| Auth required | Yes |
| Success | `204` |
| Errors | `404` not found/not owned |

### BUDGETS

| **POST /budgets** | Create a monthly category budget |
|---|---|
| Auth required | Yes |
| Body | `{ categoryId: string, month: number, year: number, limitAmount: number }` |
| Validation | limitAmount > 0; month 1–12; year 2000–2100; categoryId owned & not archived; no existing budget for (categoryId, month, year) |
| Success | `201` created budget |
| Errors | `400` validation; `404` categoryId not found; `409` duplicate budget for that category/month/year |

| **GET /budgets** | List budgets |
|---|---|
| Auth required | Yes |
| Query params | `month?, year?, categoryId?` |
| Success | `200` `[{ id, categoryId, categoryName, month, year, limitAmount, spent, remaining }]` — `spent`/`remaining` computed server-side (Section 16) |

| **GET /budgets/:id** | Get one budget |
|---|---|
| Auth required | Yes |
| Success | `200` budget (with computed `spent`/`remaining`) |
| Errors | `404` |

| **PATCH /budgets/:id** | Update a budget's limit (month/year/category not editable — delete and recreate instead, to avoid ambiguous "moved" semantics) |
|---|---|
| Auth required | Yes |
| Body | `{ limitAmount: number }` |
| Success | `200` updated budget |
| Errors | `400` validation; `404` |

| **DELETE /budgets/:id** | Delete a budget |
|---|---|
| Auth required | Yes |
| Success | `204` |
| Errors | `404` |

### DASHBOARD

| **GET /dashboard/summary** | Aggregated overview for one month |
|---|---|
| Auth required | Yes |
| Query params | `month?, year?` (default: current month/year) |
| Success | `200` `{ totalExpenses, totalBudget, remainingBudget, categorySummary: [{ categoryId, categoryName, spent, budget, remaining, percentUsed }], monthlyTrend?: [{ month, total }] }` (`monthlyTrend` = optional, last 6 months, supports the optional chart, F9) |

### REPORTS

| **GET /reports/monthly** | Monthly report data |
|---|---|
| Auth required | Yes |
| Query params | `month, year` (required) |
| Success | `200` `{ period: { month, year }, totalExpenses, byCategory: [{ categoryId, categoryName, total, budget, remaining }], byDay: [{ date, total }] }` |
| Errors | `400` missing/invalid month or year |

| **GET /reports/yearly** | Yearly report data |
|---|---|
| Auth required | Yes |
| Query params | `year` (required) |
| Success | `200` `{ period: { year }, totalExpenses, byCategory: [{ categoryId, categoryName, total }], byMonth: [{ month, total }] }` |
| Errors | `400` missing/invalid year |

| **GET /reports/export** | Download CSV or Excel |
|---|---|
| Auth required | Yes |
| Query params | `format` (`csv |
| Success | `200`, `Content-Type: text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename=...`, streamed body |
| Errors | `400` invalid/missing params |

No endpoint exists purely to "look complete" — categories, budgets, and reports each map back to an explicit assignment line (F2, F5, F6, F7, F8) or to a structural necessity documented in Section 7.

## 12. Backend Architecture

```
src/
  config/            # env loading + validation (A6), db client singleton
  middleware/
    authenticate.ts
    errorHandler.ts
    rateLimiter.ts
    validate.ts       # generic Zod-schema-to-middleware wrapper
  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.validation.ts
      auth.types.ts
      auth.test.ts
    categories/        # same 6-file pattern
    expenses/
    budgets/
    dashboard/
    reports/
  utils/
    hash.ts            # bcrypt wrappers
    tokens.ts          # JWT + refresh token helpers
    money.ts           # Decimal formatting helpers
  app.ts               # express() + middleware wiring + route mounting
  server.ts            # http.listen, graceful shutdown
```

**Layer responsibilities**

| Layer | Owns | Must never contain |
|---|---|---|
| Routes | URL → controller wiring, applying `authenticate`/`validate` middleware | Any logic |
| Controller | Reading `req`, calling the Zod-validated DTO through to the service, mapping the service's result/errors to HTTP status + JSON | SQL, Prisma calls, business rules (e.g., "is this a duplicate budget") |
| Service | Business rules: ownership checks, duplicate-budget check, dashboard/report number-crunching orchestration, transaction boundaries | Reading `req`/`res` directly, raw SQL strings |
| Repository | The only layer importing `PrismaClient`; every method signature includes `userId` | Business rules (e.g., does not decide whether a budget is a duplicate — it exposes a `findByCategoryMonthYear` used by the service to decide) |
| Validation (Zod schemas) | Shape/type/range checks on request bodies and query params | Ownership checks (that needs a DB round-trip, so it belongs in the service) |

**Explicitly prevented anti-patterns:** no `prisma.*` calls inside a controller file (enforced by code review checklist in Section 27, optionally an ESLint import-restriction rule scoping `@prisma/client` imports to `*.repository.ts`); no duplicated ownership-check logic (`WHERE user_id = ...`) written ad hoc per query — it lives once, per repository method; no god-service — `expenses.service.ts` only knows about expenses, dashboard aggregation lives in `dashboard.service.ts` even though it reads expense/budget data (it calls the expense and budget repositories, not the other way around).

## 13. Frontend Architecture

**Pages**

| Page | Purpose | Key components | API calls | States handled |
|---|---|---|---|---|
| Login | Authenticate | `LoginForm` | `POST /auth/login` | loading, error (invalid creds), success→redirect |
| Register | Create account | `RegisterForm` | `POST /auth/register` | loading, error (duplicate email), success→redirect |
| Dashboard | Monthly overview | `SummaryCards`, `CategoryBreakdownChart` (optional), `MonthPicker` | `GET /dashboard/summary` | loading (skeleton cards), empty (no expenses yet → CTA to add one), error (retry banner) |
| Expenses | Manage expense records | `ExpenseTable`/`ExpenseCardList` (responsive swap), `ExpenseFilterBar`, `ExpenseFormModal`, `Pagination` | `GET/POST/PATCH/DELETE /expenses` | loading, empty (no results for filter), error, success (optimistic row update) |
| Budgets | Manage monthly limits | `BudgetList`, `BudgetFormModal`, `MonthYearPicker` | `GET/POST/PATCH/DELETE /budgets` | loading, empty (no budgets this month), error |
| Categories | Manage categories | `CategoryList`, `CategoryFormModal` | `GET/POST/PATCH/DELETE /categories` | loading, empty (first-run, before seed data appears), error |
| Reports | Monthly/yearly reports + export | `ReportPeriodPicker`, `ReportSummary`, `ExportButtons` | `GET /reports/monthly`, `GET /reports/yearly`, `GET /reports/export` | loading, empty (no data for period), error, download-in-progress |

**Reusable components:** `Button`, `Input`, `Select`, `Modal`, `ConfirmDialog`, `Toast`/`ToastProvider`, `Card`, `Table` (desktop) / `StackedCard` (mobile) pair driven by one shared `columns` config, `EmptyState`, `ErrorBanner`, `Skeleton`.

**Routing.** React Router v6, top-level:

```
/login, /register            (public)
/                              (ProtectedRoute) → redirects to /dashboard
/dashboard, /expenses, /budgets, /categories, /reports   (ProtectedRoute)
```

`ProtectedRoute` reads auth context; if no valid access token in memory and the silent-refresh-on-load attempt fails, redirect to `/login`.

**Authentication state.** A small `AuthContext` holds `{ user, accessToken, isLoading }`. On app mount, it calls `POST /auth/refresh` once (cookie-based) to silently re-establish a session before rendering protected routes — this is what makes sessions "persistent" per B3 without the user re-logging in on every tab/reload.

**API client.** One Axios instance:

```
const api = axios.create({ baseURL: API_URL, withCredentials: true });
api.interceptors.request.use(cfg => { if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`; return cfg; });
api.interceptors.response.use(
  res => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { data } = await api.post('/auth/refresh');   // cookie sent automatically
      setAccessToken(data.accessToken);
      error.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(error.config);                            // replay original request once
    }
    return Promise.reject(error);
  }
);
```

A single in-flight refresh is de-duplicated (a shared promise) so N simultaneous 401s trigger one refresh call, not N.

**Server state (TanStack Query).** One query-key namespace per resource: `['expenses', filters]`, `['budgets', month, year]`, `['dashboard', month, year]`. Mutations (`useMutation`) call `queryClient.invalidateQueries(['expenses'])` and, where an expense mutation can change budget math, also invalidate `['budgets']` and `['dashboard']` — this is the mechanism that keeps the dashboard correct after any expense edit without manual refetch wiring per page.

**Form state.** React Hook Form + a Zod resolver per form (`expenseSchema`, `budgetSchema`, etc.), the same shape family as the backend's validation schemas (not literally shared code across a monorepo boundary here, but intentionally mirrored field-for-field to avoid drift).

**Optimistic updates:** used for expense delete only (row disappears immediately, rolled back on error) — chosen narrowly because delete is the one mutation with no server-computed fields to reconcile; create/update wait for the server response since the server returns the joined category object.

## 14. UI/UX Architecture

General layout: **desktop** — persistent left sidebar (Dashboard/Expenses/Budgets/Categories/Reports/Logout) + top bar (month/year picker where relevant, user menu). **mobile** — sidebar collapses to a bottom tab bar (5 icons) plus a hamburger for secondary items (Categories, Logout); tables become stacked cards; filter bars collapse into a "Filters" button opening a bottom sheet.

| Screen | Layout | Forms | Table/Cards | Filters | Confirmations | Feedback |
|---|---|---|---|---|---|---|
| Login/Register | Centered single-column card, full-height on mobile | Email/password (+name on register), inline field errors | — | — | — | Toast on network error; inline error under form on 401/409 |
| Dashboard | Grid of 3 summary cards (Total Spent, Total Budget, Remaining) + category breakdown list/chart below; desktop = 3-column grid, mobile = stacked | Month/year picker only | Category breakdown as horizontal progress bars (spent vs. limit), color = category color, red state if `percentUsed > 100` | Month/year selector | — | Skeleton cards while loading; empty-state illustration + "Add your first expense" CTA if no data for the period |
| Expenses | Filter bar above list/table | Add/Edit expense in a modal (amount, category select, date picker, description) | Desktop: sortable table (date, category, amount, description, actions). Mobile: card per expense | Date range, category dropdown, min/max amount — collapsible on mobile | "Delete this expense?" confirm dialog before DELETE | Toast on create/update/delete success; inline error on validation failure |
| Budgets | List of budget cards per category for the selected month | Add/Edit budget modal (category select — excludes categories that already have a budget for that month, amount input) | Card per budget: category, limit, spent, remaining, progress bar | Month/year selector | "Delete this budget?" confirm dialog | Toast on success; inline `409` message ("A budget for this category already exists this month") mapped to the amount/category field |
| Categories | Simple list with inline archive toggle | Add/Edit category modal (name, color swatch picker) | List rows, archived shown greyed with an "Unarchive" action | Show/hide archived toggle | "Archive this category?" (not "delete," to set correct expectation that history is preserved) | Toast |
| Reports | Period picker (month or year tab) + summary numbers + per-category table + export buttons | — | Table: category, total, budget (monthly only), remaining | Month or year selector | — | Loading spinner on export button while the file streams; browser's native download on completion |

**Dashboard visualizations (concrete):** 3 stat cards (Total Expenses, Total Budget, Remaining Budget — remaining rendered in red if negative); one horizontal bar per category showing spent/limit; optional (F9) donut chart of spend-by-category and an optional 6-month line chart of total spend trend, both via Recharts, both behind a "charts" tab so their absence never blocks the required numeric summary from rendering.

## 15. Expense Management Workflow

**Create:** `ExpenseFormModal` (RHF+Zod validates client-side) → `useCreateExpense` mutation → `POST /expenses` → `authenticate` middleware → `validate(expenseCreateSchema)` middleware → `expenses.controller.create` → `expenses.service.create` (verifies `categoryId` belongs to caller and is not archived) → `expenses.repository.create` (Prisma insert) → PostgreSQL insert (constraints checked) → row returned → service joins category for the response DTO → controller sends `201` → mutation's `onSuccess` invalidates `['expenses']`, `['dashboard']`, `['budgets']` query caches → UI re-renders the list and dashboard with fresh data, modal closes, success toast fires.

**Edit:** same path via `PATCH /expenses/:id`; service re-verifies ownership of the expense and of any new `categoryId` before calling the repository update; same cache invalidation on success.

**Delete:** `ConfirmDialog` → `useDeleteExpense` mutation applies an **optimistic** removal from the `['expenses']` cache → `DELETE /expenses/:id` → service checks ownership → repository delete → `204` → cache invalidation confirms the removal (or, on error, the mutation's `onError` restores the optimistic cache to its prior snapshot and a toast explains the failure).

**List:** `ExpenseTable` reads current filter/sort/page state (local `useState`, not global) → `useExpenses(filters)` query → `GET /expenses?...` → controller parses/validates query params → service passes a typed filter object to the repository → repository builds a Prisma `where` clause (`AND`-combined) plus `skip/take` for pagination and `orderBy` for sort → PostgreSQL executes against the `(user_id, expense_date)`/`(user_id, category_id)` indexes → response `{ data, meta }` → table renders rows + `Pagination` renders `meta`.

**Filter:** changing any filter control updates local state → React Query's key changes → automatic refetch (`['expenses', filters]`); filters combine with logical AND, exactly mirroring the query-param contract in Section 11.

**Paginate:** `Pagination` component reads `meta.page/meta.totalPages`, dispatches `page` changes into the same local filter state — no separate code path from filtering, since page is just one more query param.

## 16. Budget Management Workflow

**Create:** `BudgetFormModal` (category picker excludes categories that already have a budget for the selected month/year, fetched via `GET /budgets?month&year` client-side to populate the exclusion list) → `POST /budgets` → service re-checks uniqueness server-side regardless of the client-side filtering (client-side exclusion is a UX nicety, not the source of truth) → on the DB unique-constraint violation (`P2002`), service translates it to a domain error → controller returns `409` → form surfaces the error on the category field.

**Edit:** `PATCH /budgets/:id`, `limitAmount` only (category/month/year are immutable by design — Section 11 — to avoid ambiguous semantics like "did this budget move to a new month, or did a new budget appear").

**Delete:** `DELETE /budgets/:id` after confirm dialog; deleting a budget does **not** delete or alter any expenses — expenses are independent facts; a missing budget just means "no limit set" for that category/month going forward.

**List / calculations.** `GET /budgets?month&year` computes, per budget row, in one SQL query per Section 17's approach:

- `spent` = `SUM(expenses.amount)` where `expenses.category_id = budgets.category_id AND expenses.user_id = budgets.user_id AND date_part('month', expense_date) = budgets.month AND date_part('year', expense_date) = budgets.year`
- `remaining` = `limitAmount - spent`
- `percentUsed` = `spent / limitAmount * 100` (frontend clamps display at 100% for the progress bar but shows the true percentage as text if over)

**Defined behavior for edge cases**

| Situation | Behavior |
|---|---|
| No budget exists for a category this month | Dashboard/report shows that category's spend with `budget: null`, `remaining: null` — spend is never hidden just because it's unbudgeted |
| An expense pushes spend over the budget | No blocking — the expense still saves (the assignment does not ask for hard spending caps); the UI shows `percentUsed > 100%` in a warning color |
| A budget is deleted | Its past association with expenses is not stored anywhere (the relationship is computed at read time, not a stored foreign key on the expense), so nothing about existing expenses changes; the category simply shows as unbudgeted going forward |
| A category is archived | Existing budgets for it remain visible/queryable (historical correctness); the "create new budget" category picker excludes archived categories |
| An expense is added after the budget for its month already exists | The next read of `spent` includes it automatically — `spent` is never cached/stored, always computed live |

## 17. Dashboard Architecture

**Principle:** the dashboard endpoint returns already-aggregated numbers; the browser never downloads the raw expense list to compute a total.

**Representative SQL (what the repository's aggregation query does, conceptually — actual code goes through Prisma's query builder or `$queryRaw` for the parts Prisma's builder can't express cleanly, e.g. multi-column month/year grouping):**

```
SELECT
  c.id                          AS category_id,
  c.name                        AS category_name,
  COALESCE(SUM(e.amount), 0)    AS spent,
  b.limit_amount                AS budget
FROM categories c
LEFT JOIN expenses e
  ON e.category_id = c.id
 AND e.user_id = c.user_id
 AND EXTRACT(MONTH FROM e.expense_date) = $month
 AND EXTRACT(YEAR  FROM e.expense_date) = $year
LEFT JOIN budgets b
  ON b.category_id = c.id
 AND b.user_id = c.user_id
 AND b.month = $month
 AND b.year  = $year
WHERE c.user_id = $userId AND c.is_archived = false
GROUP BY c.id, c.name, b.limit_amount;
```

`totalExpenses` and `totalBudget` are `SUM()` over this same result set (or a parallel simpler aggregate query); `remainingBudget = totalBudget - totalExpenses`.

**API response shape** — see Section 11's `/dashboard/summary` entry.

**Indexes used:** `expenses(user_id, category_id)` and `expenses(user_id, expense_date)` support the join+filter; `budgets(user_id, year, month)` supports the budget join.

**Frontend visualization:** the response maps 1:1 onto `SummaryCards` (3 numbers) and `CategoryBreakdownChart`/list (one row per `categorySummary` entry) — no client-side re-aggregation of any kind.

## 18. Reporting Architecture

**Monthly report** (`GET /reports/monthly`): same category-grouped aggregation as the dashboard, scoped to one month, plus a `byDay` breakdown (`GROUP BY expense_date`) for a spend-over-time view.

**Yearly report** (`GET /reports/yearly`): `GROUP BY EXTRACT(MONTH FROM expense_date)` for `byMonth`, and `GROUP BY category_id` for `byCategory`, both scoped to the year via `EXTRACT(YEAR FROM expense_date) = $year`.

**CSV/Excel export.** The export endpoint re-runs the same aggregation query used by the on-screen report (single source of truth for the numbers — the file a user downloads always matches what they saw on screen) and streams it:

- CSV via `fast-csv`, piped directly to the HTTP response (`res`) as rows are produced — no full string built in memory.
- Excel via `exceljs`'s streaming `WorkbookWriter`, same principle.

**Synchronous vs. background job — decision.** Reports are generated **synchronously**, in the request/response cycle, not via a queue/worker. Justification: this is a single-user personal-finance tool; even a "heavy" user logging 10 expenses/day for 5 years is ~18,000 rows, and the export query is a single indexed, aggregated `GROUP BY` — this returns in well under a second on Postgres with the indexes in Section 8. Introducing a job queue (BullMQ/Redis) and a polling/webhook download-ready flow would add operational complexity (a queue, a worker process, a job-status endpoint) with no user-visible benefit at this data scale. This is explicitly flagged as **an engineering decision that would be revisited** if the product needed multi-year, multi-thousand-user aggregate reports (e.g., an admin analytics view) — out of scope here.

**Large dataset handling within the sync approach:** streaming writers (above) keep memory flat regardless of row count; the underlying SQL query is the only place row count matters, and it is bounded by the indexed date-range filter (a report is always scoped to one month or one year, never "all time").

## 19. Validation & Error Handling

**Frontend:** Zod schemas colocated with each form, wired through React Hook Form's `zodResolver`; inline field errors, submit blocked until valid.

**Backend:** a generic `validate(schema)` middleware runs `schema.safeParse({ ...req.body, ...req.params, ...req.query })` before the controller executes; on failure it short-circuits with `400` and a field-level error list — controllers never see invalid shapes.

**Database:** `CHECK`, `NOT NULL`, `UNIQUE`, and FK constraints (Sections 7–8) are the last line of defense — they catch bugs in the two layers above, they are not the primary validation mechanism (by the time a `CHECK` fires in production, it indicates the app-level validation has a gap worth fixing).

**Standard error response shape (every 4xx/5xx):**

```
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount must be greater than 0",
    "details": [{ "field": "amount", "message": "must be greater than 0" }]
  }
}
```

**Status code usage**

| Code | Used for |
|---|---|
| 400 | Malformed/invalid request body or query params |
| 401 | Missing/invalid/expired access token; failed login; invalid refresh token |
| 403 | Reserved (unused in this scope — see Section 10: ownership mismatches return 404, not 403, to avoid confirming a resource exists) |
| 404 | Resource not found, or found but not owned by the caller |
| 409 | Unique-constraint conflicts (duplicate email, duplicate category name, duplicate budget) |
| 422 | Not used — 400 covers all validation failures in this API; 422 is not introduced without a concrete case that needs the "syntactically valid but semantically wrong" distinction |
| 429 | Rate limit exceeded (`/auth/login`, `/auth/register`) |
| 500 | Unhandled server error — a global Express error-handling middleware catches these, logs the stack server-side, and returns a generic message (never the raw error/stack) to the client |

## 20. Security Architecture

| Concern | Measure | Relevant here? |
|---|---|---|
| Password storage | bcrypt, cost factor 12 | Yes — required (assignment: JWT auth implies credential storage) |
| JWT security | Short-lived (15 min) access token, signed with a secret from env, `alg` pinned to HS256 (no `alg:none` acceptance) | Yes |
| Refresh token security | Opaque random value, hashed at rest, httpOnly cookie, rotation + reuse detection (Section 10) | Yes |
| Cookies | `httpOnly`, `Secure` (prod), `SameSite=Strict`, scoped `path=/api/auth` | Yes |
| CORS | Whitelist the exact frontend origin, `credentials: true` (required for the cookie to be sent cross-origin if FE/BE are on different domains in prod) | Yes |
| Rate limiting | `express-rate-limit` on `/auth/login`, `/auth/register`, `/auth/refresh` | Yes — brute-force/credential-stuffing mitigation |
| Input validation | Zod on every endpoint (Section 19) | Yes |
| SQL injection | Prisma parameterizes all queries by default; the one raw-SQL aggregation query (Section 17) uses Prisma's tagged-template `$queryRaw` (parameterized), never string concatenation | Yes |
| XSS | React escapes rendered text by default; no `dangerouslySetInnerHTML` anywhere in this app (nothing here renders user-supplied HTML) | Yes, but low incremental risk given no rich-text fields |
| CSRF | Main API calls carry the access token in an `Authorization` header (not a cookie), so they are not CSRF-able by definition; the one cookie-based endpoint (`/auth/refresh`) is mitigated by `SameSite=Strict` plus its narrow `path` scope | Yes, scoped narrowly |
| Authorization | Every data query filtered by `user_id` at the repository layer (Section 10/12) | Yes — this is the core "User A can't touch User B's data" guarantee |
| Sensitive logging | Request logger redacts `password`, `Authorization`, and cookie headers before writing to logs | Yes |
| Environment secrets | `JWT_SECRET`, `DATABASE_URL`, `COOKIE_SECRET` etc. via `.env`, never committed (`.gitignore`'d), validated present-and-non-default at boot via a small Zod env schema in `config/` | Yes — A6 |
| Database credentials | Only in `DATABASE_URL` env var; not hardcoded; different values per environment (dev/test/prod) | Yes |
| Production configuration | `NODE_ENV=production` disables verbose error bodies, enables `Secure` cookie flag, trusts proxy for correct client IP behind a load balancer | Yes |

Not added because not relevant to this scope: role-based access control (no admin role exists), 2FA/MFA (not requested), file-upload scanning (no file uploads other than the report export, which is server-generated, not user-uploaded).

## 21. Performance & Database Optimization

| Optimization | Applied where | Necessary now vs. future |
|---|---|---|
| `(user_id, expense_date)` index | Expense list/filter/report date-range queries | Necessary now |
| `(user_id, category_id)` index | Expense filter by category, dashboard join | Necessary now |
| `(user_id, year, month)` index | Budget lookup, dashboard/report budget join | Necessary now |
| Pagination (default 20, max 100) on `GET /expenses` | Prevents unbounded result sets as history grows | Necessary now |
| SQL-side `SUM`/`GROUP BY` instead of client-side reduction | Dashboard, reports (Sections 17–18) | Necessary now — this is the single highest-impact decision in the system |
| Avoiding N+1 queries | Prisma `include`/`select` used to fetch an expense's category in the same query, never a per-row follow-up query in a loop | Necessary now |
| Connection pooling | Prisma's built-in pool (tunable `connection_limit` in `DATABASE_URL`) | Necessary now, default settings suffice at this scale |
| Frontend caching | TanStack Query `staleTime` (e.g., 30s for dashboard, 10s for expense list) avoids refetching on every component remount | Necessary now |
| API-level response caching (e.g., Redis) | — | **Future** — no evidence of need at single-user data volumes; would add an unjustified moving part |
| Stored procedures | — | **Future/optional** — assignment marks this optional (A10); the current query complexity (Sections 17–18) does not need procedural logic beyond what Prisma/`$queryRaw` express clearly, and keeping logic in the codebase (vs. inside the DB) keeps it version-controlled and testable the same way as everything else |
| Materialized views for reports | — | **Future** — only relevant if report queries start showing up in slow-query logs at real usage scale |
| Read replicas / sharding | — | **Future** — not remotely justified at this application's scale |

## 22. Testing Strategy

**Backend (Jest + Supertest)**

- Unit tests on **services**: budget-duplicate detection, dashboard remaining-budget math, report date-boundary math (month/year filters at edges — e.g., Jan 31 vs. Feb 1, Dec→Jan year rollover), refresh-token rotation/reuse logic.
- Integration/API tests per module, hitting a real test database (a disposable Postgres schema, migrated fresh per test run): registration (success, duplicate email), login (success, wrong password, unknown email), refresh (success, rotation, reuse-detection), logout, each CRUD endpoint's happy path, each CRUD endpoint's ownership check (user A cannot fetch/edit/delete user B's row — asserted with two seeded users per test), each CRUD endpoint's validation failures, budget duplicate `409`, category duplicate `409`.
- Negative cases explicitly included: expired access token, malformed JWT, missing refresh cookie, negative amount, non-existent categoryId on expense create, month=13 on budget create.

**Frontend (Vitest/Jest + React Testing Library, MSW for API mocking)**

- Component tests: form validation messages (`ExpenseFormModal` rejects amount ≤ 0), `Pagination` control behavior, `ConfirmDialog` firing the delete callback only on confirm.
- Page tests: `Dashboard` renders summary cards from a mocked API response; `Expenses` page applies a filter and re-requests with the right query params; empty/error/loading states render the correct UI for each page (Section 14's per-screen state list).
- Hook tests: `useExpenses`/`useBudgets` cache invalidation after a mutation (mocked mutation → assert the list query refetches).

**End-to-end (Playwright — recommended, tied to T1's "has weightage" note)** Scenarios: register → auto-login lands on empty dashboard; login → refresh persists session across a page reload; create category → create expense against it → dashboard reflects the new total; create budget → add an expense exceeding it → budget card shows over-limit state; edit and delete an expense → totals update; filter expenses by date/category/amount; generate a monthly report and confirm a CSV downloads; logout → protected routes redirect to `/login`.

A detailed requirement-to-test mapping is consolidated in Section 26 rather than duplicated here.

## 23. Development Phases

| Phase | Objective | Prerequisites | Key tasks | DB changes | APIs | Frontend | Tests | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| 0 — Architecture & repo setup | Repos exist, tooling agreed | None | Create backend/frontend repos (or monorepo), configure TS/ESLint/Prettier, commit this plan as `/docs/PLAN.md` | — | — | — | — | `npm run build` succeeds in both projects on a clean clone |
| 1 — Project scaffolding | Runnable skeleton apps | Phase 0 | Express app boots on a health-check route; Vite React app boots to a blank page; env-var loading validated at startup (A6) | — | `GET /health` | Vite scaffold + router shell | Smoke test: server starts, health check returns 200 | Both apps run locally with one command each |
| 2 — Database schema | Schema live in a real Postgres instance | Phase 1 | Write Prisma schema (Section 8), run first migration, write seed script | users, categories, expenses, budgets, refresh_tokens created | — | — | — | `prisma migrate dev` + `prisma db seed` succeed against a local Postgres |
| 3 — Authentication | Full auth flow working | Phase 2 | Implement register/login/refresh/logout/me per Section 10 | refresh_tokens populated on login | AUTH block (Section 11) | Login/Register pages, AuthContext, silent-refresh-on-load | Auth integration tests (Section 22) | A user can register, close the tab, reopen it, and remain logged in |
| 4 — Categories | Minimal category CRUD | Phase 3 | Implement category CRUD, archive-not-delete | categories rows read/write | CATEGORIES block | Categories page | Category CRUD + duplicate-name tests | User can create/rename/archive categories |
| 5 — Expense module | Full expense CRUD + filtering + pagination | Phase 4 | Implement per Section 15 | expenses rows | EXPENSES block | Expenses page, filter bar, form modal | Expense CRUD/ownership/validation tests | User can add, edit, delete, filter, and paginate expenses |
| 6 — Budget module | Full budget CRUD + computed spent/remaining | Phase 5 | Implement per Section 16 | budgets rows | BUDGETS block | Budgets page | Budget CRUD/duplicate/ownership tests | User can set, edit, delete monthly category budgets with correct live spent/remaining |
| 7 — Dashboard | Aggregated summary endpoint + page | Phase 6 | Implement Section 17's aggregation query and endpoint | — (read-only) | DASHBOARD block | Dashboard page, summary cards, category breakdown | Dashboard aggregation unit + integration tests | Dashboard totals match manually-computed totals for a seeded dataset |
| 8 — Reports | Monthly/yearly reports + CSV/Excel export | Phase 7 | Implement Section 18 | — (read-only) | REPORTS block | Reports page, export buttons | Report math + export-stream tests | Downloaded CSV/Excel figures match on-screen report figures |
| 9 — Frontend integration polish | All pages fully wired, no mock data left | Phase 8 | Replace any placeholder/mock calls, wire toasts/loading/empty/error states everywhere per Section 14 | — | — | All pages | Page-level RTL tests | Every page has real loading/empty/error states, not just happy path |
| 10 — Responsive UI | Mobile + desktop layouts correct | Phase 9 | Apply Tailwind responsive breakpoints, table↔card swap, bottom nav on mobile | — | — | Layout components | Manual device-width QA pass (Chrome DevTools breakpoints) | App is usable at common mobile widths (e.g., 375px) and desktop widths, tablet intentionally unhandled |
| 11 — Testing hardening | Full test suite green | Phase 10 | Fill gaps identified against Section 22's checklist | — | — | — | Full backend + frontend suites | CI (or local `npm test`) green across both projects |
| 12 — Security hardening | Section 20 checklist fully applied | Phase 11 | Add helmet/cors/rate-limit if not already wired in Phase 3, redact logs, verify prod cookie flags | — | — | — | Auth negative-case tests (expired/invalid/reused tokens) all pass | Section 20's table has no unaddressed "Yes" row |
| 13 — Deployment (optional, D1/D4) | Live URL | Phase 12 | Provision managed Postgres, deploy backend, deploy frontend, wire prod env vars/CORS (Section 28) | Run `prisma migrate deploy` against prod DB | — | Point frontend `API_URL` at deployed backend | Smoke test against prod URL | App reachable and functional at a public URL |
| 14 — Documentation & final audit | Submission-ready | Phase 13 (or 12 if not deploying) | Write README (Section 29), run the Section 30 audit, tick Section 31's checklist | — | — | — | — | Every item in Section 31 is checked |

## 24. Detailed Task Breakdown

Representative, executable task list (not exhaustive to the line, but sized so each task is a single sitting of work). IDs group by phase/module.

| Task ID | Name | Depends on | Files affected | Expected output | Acceptance criteria | Tests |
|---|---|---|---|---|---|---|
| ARCH-001 | Initialize backend TS project | — | `package.json`, `tsconfig.json` | Compiles empty project | `tsc --noEmit` passes | — |
| ARCH-002 | Initialize frontend Vite+TS+React project | — | `package.json`, `vite.config.ts` | Blank app renders | `npm run dev` serves a page | — |
| ARCH-003 | Add env-var loading & validation | ARCH-001 | `config/env.ts` | Typed `env` object | Boot fails loudly if `JWT_SECRET`/`DATABASE_URL` missing | Unit test for missing-var case |
| DB-001 | Write Prisma schema | ARCH-001 | `prisma/schema.prisma` | Schema matches Section 8 | `prisma validate` passes | — |
| DB-002 | First migration | DB-001 | `prisma/migrations/*` | Tables created | `prisma migrate dev` succeeds locally | — |
| DB-003 | Seed script | DB-002 | `prisma/seed.ts` | Default categories inserted per new user (called from registration, not standalone) | Seed logic covered by registration test | Registration integration test |
| AUTH-001 | Password hash utility | ARCH-001 | `utils/hash.ts` | `hashPassword`/`verifyPassword` | bcrypt cost 12 | Unit test round-trip |
| AUTH-002 | Token utilities | ARCH-001 | `utils/tokens.ts` | `signAccessToken`, `generateRefreshToken`, `hashToken` | 15-min access token exp, 256-bit refresh token | Unit tests |
| AUTH-003 | Register endpoint | AUTH-001, DB-003 | `modules/auth/*` | `POST /auth/register` | Matches Section 11 spec | Integration test (success + duplicate email) |
| AUTH-004 | Login endpoint | AUTH-002 | `modules/auth/*` | `POST /auth/login` | Matches Section 11 spec | Integration test (success + wrong password) |
| AUTH-005 | Refresh endpoint w/ rotation & reuse detection | AUTH-004 | `modules/auth/*` | `POST /auth/refresh` | Rotation + reuse revocation per Section 10 | Integration tests: normal refresh, reused-token revokes family |
| AUTH-006 | Logout endpoint | AUTH-005 | `modules/auth/*` | `POST /auth/logout` | Cookie cleared, token revoked | Integration test |
| AUTH-007 | `authenticate` middleware | AUTH-002 | `middleware/authenticate.ts` | Rejects missing/expired/invalid tokens | 401 on all three cases | Unit/integration tests |
| CAT-001 | Category CRUD (create/list/update/archive) | AUTH-007 | `modules/categories/*` | Endpoints per Section 11 | Duplicate name → 409; archive not hard-delete | Integration tests |
| EXP-001 | Expense create/get/update/delete | CAT-001 | `modules/expenses/*` | Endpoints per Section 11 | Ownership + categoryId checks enforced | Integration tests incl. cross-user 404 |
| EXP-002 | Expense list with filter/sort/pagination | EXP-001 | `modules/expenses/*` | `GET /expenses` per Section 11 | Filters combine with AND; pagination meta correct | Integration tests per filter combination |
| BUD-001 | Budget create/get/update/delete | CAT-001 | `modules/budgets/*` | Endpoints per Section 11 | Duplicate (category,month,year) → 409 | Integration tests |
| BUD-002 | Budget list w/ computed spent/remaining | EXP-001, BUD-001 | `modules/budgets/*` | `GET /budgets` returns spent/remaining/percentUsed | Numbers match Section 16's formulas | Unit test on the calc function + integration test end-to-end |
| DASH-001 | Dashboard summary aggregation query | BUD-002 | `modules/dashboard/*` | `GET /dashboard/summary` per Section 17 | Matches manually-verified totals on seeded data | Integration test w/ seeded fixtures |
| REP-001 | Monthly/yearly report endpoints | DASH-001 | `modules/reports/*` | `GET /reports/monthly`, `/yearly` | Matches Section 18 shapes | Integration tests |
| REP-002 | CSV export | REP-001 | `modules/reports/*`, `utils/export.ts` | Streamed CSV, figures match on-screen report | Downloaded file parses to expected rows | Integration test asserting response headers + streamed content |
| REP-003 | Excel export | REP-001 | `modules/reports/*`, `utils/export.ts` | Streamed XLSX | Same as REP-002, `.xlsx` format | Integration test |
| FE-001 | Auth context + silent refresh on load | AUTH-005 | `context/AuthContext.tsx` | Session persists across reload | Manual + Playwright reload test | Playwright scenario |
| FE-002 | Axios instance w/ refresh interceptor | FE-001 | `api/client.ts` | 401 triggers one refresh + retry, de-duplicated | No duplicate refresh calls on parallel 401s | Unit test with mocked axios |
| FE-003 | Login/Register pages | FE-002 | `pages/Login.tsx`, `pages/Register.tsx` | Forms per Section 14 | Inline validation, error toasts | RTL tests |
| FE-004 | Dashboard page | DASH-001, FE-002 | `pages/Dashboard.tsx` | Cards + breakdown per Section 14 | Loading/empty/error states present | RTL test with MSW |
| FE-005 | Expenses page (table/cards, filters, modal, pagination) | EXP-002, FE-002 | `pages/Expenses.tsx` | Full CRUD UI per Sections 14–15 | Responsive table↔card swap | RTL tests + Playwright CRUD scenario |
| FE-006 | Budgets page | BUD-002, FE-002 | `pages/Budgets.tsx` | Full CRUD UI per Sections 14/16 | Duplicate-budget error surfaced on the right field | RTL tests |
| FE-007 | Categories page | CAT-001, FE-002 | `pages/Categories.tsx` | CRUD + archive UI | Archive wording (not "delete") per Section 14 | RTL tests |
| FE-008 | Reports page + export buttons | REP-003, FE-002 | `pages/Reports.tsx` | Period picker, summary, export | Triggers real file download | Playwright export scenario |
| FE-009 (opt) | Charts (F9) | FE-004, FE-008 | `components/charts/*` | Donut + trend line via Recharts | Renders without blocking numeric summary if data is sparse | Snapshot/RTL test |
| TEST-001 | Backend test-DB setup | DB-002 | `jest.setup.ts` | Fresh schema per test run | CI can run backend suite hermetically | — |
| TEST-002 | Frontend MSW setup | FE-002 | `test/msw/handlers.ts` | Mocked API for all modules | Page tests run without a live backend | — |
| DEP-001 (opt) | Backend deploy config | Phase 12 complete | `Dockerfile` or platform config | Backend reachable at a public URL | Prod env vars set, `migrate deploy` run | Smoke test |
| DEP-002 (opt) | Frontend deploy config | DEP-001 | Platform config (Vercel/Netlify) | Frontend reachable, pointed at prod API | CORS allows the prod frontend origin | Smoke test |

## 25. Dependency Graph

```
Phase 0 ─▶ Phase 1 ─▶ Phase 2 ─▶ Phase 3 ─▶ Phase 4 ─▶ Phase 5 ─┬─▶ Phase 6 ─▶ Phase 7 ─▶ Phase 8
 (setup)   (scaffold) (DB)       (auth)     (categories)(expenses)│  (budgets) (dashboard)(reports)
                                                                    │
                                                                    ▼
                                                              (budgets needs
                                                               expenses for
                                                               spent-calc)

Phase 8 ─▶ Phase 9 (FE integration) ─▶ Phase 10 (responsive) ─▶ Phase 11 (tests)
        ─▶ Phase 12 (security) ─▶ Phase 13 (deploy, optional) ─▶ Phase 14 (docs/audit)
```

Note the one non-linear dependency called out explicitly: **Budget's `spent` calculation (Phase 6) depends on the Expense module (Phase 5)** existing first, even though both "could" be built in either order per the assignment's own suggested phase list — this plan's ordering (Section 23) fixes that dependency, deviating slightly from the assignment's example order for this reason.

## 26. Requirement Traceability Matrix

| Requirement | Architecture | API | DB | Frontend | Test | Phase |
|---|---|---|---|---|---|---|
| Login/registration pages (F1) | Auth architecture (§10) | POST /auth/register, /login | users | Login.tsx, Register.tsx | Auth integration + RTL | 3 |
| Dashboard: totals/remaining/category summary (F2) | Dashboard architecture (§17) | GET /dashboard/summary | expenses, budgets, categories | Dashboard.tsx | Dashboard aggregation test | 7 |
| Add/edit/delete expense (F3) | Expense workflow (§15) | POST/PATCH/DELETE /expenses | expenses | Expenses.tsx + modal | Expense CRUD integration | 5 |
| Filter expenses by date/category/amount (F4) | §15, §21 indexes | GET /expenses (query params) | expenses (indexed) | ExpenseFilterBar | Filter-combination integration tests | 5 |
| Monthly budget limits per category (F5) | Budget workflow (§16) | POST /budgets | budgets | Budgets.tsx | Budget create + duplicate tests | 6 |
| Edit/delete budget limits (F6) | §16 | PATCH/DELETE /budgets | budgets | Budgets.tsx | Budget update/delete tests | 6 |
| Monthly/yearly reports (F7) | Reporting architecture (§18) | GET /reports/monthly, /yearly | expenses, budgets, categories | Reports.tsx | Report math tests | 8 |
| CSV/Excel export (F8) | §18 | GET /reports/export | — | Reports.tsx export buttons | Export stream tests | 8 |
| Charts/graphs (F9, optional) | §14 dashboard viz | (reuses /dashboard/summary's monthlyTrend) | — | charts components | Snapshot tests | 9 (opt) |
| Responsive mobile+desktop, no tablet (F10) | §14 | — | — | Tailwind breakpoints across all pages | Manual device-width QA | 10 |
| JWT auth (B1) | §10 | all authenticated routes | — | AuthContext | Auth tests | 3 |
| Register/login endpoints (B2) | §10 | POST /auth/register, /login | users | — | Integration tests | 3 |
| Refresh token mechanism (B3) | §10 | POST /auth/refresh | refresh_tokens | Axios interceptor (§13) | Refresh + reuse-detection tests | 3 |
| CRUD expense endpoints (B4) | §12 | full EXPENSES block | expenses | — | Integration tests | 5 |
| CRUD budget endpoints (B5) | §12 | full BUDGETS block | budgets | — | Integration tests | 6 |
| SQL schema: users/expenses/budgets (B6) | §8 | — | users, expenses, budgets | — | Migration runs clean | 2 |
| Relational DB (B7) | §4, §8 | — | PostgreSQL | — | — | 2 |
| React Hooks used effectively (A1) | §13 (TanStack Query, RHF, custom hooks) | — | — | all pages | RTL/hook tests | 3–9 |
| TS interfaces/types (A2) | §12, §13 | typed DTOs | Prisma-generated types | typed props/state throughout | `tsc --noEmit` in CI | all |
| Charting library (A3, optional) | §14 | — | — | Recharts components | Snapshot tests | 9 (opt) |
| Request validation/error handling (A4) | §19 | Zod on every endpoint | CHECK constraints (defense-in-depth) | RHF+Zod on every form | Validation negative-case tests | 3–8 |
| TypeScript backend (A5) | §4, §12 | — | Prisma types | — | `tsc --noEmit` | all |
| Env variables (A6) | §20 | — | DATABASE_URL etc. | VITE_API_URL | Boot-fails-without-env test | 0–1 |
| Transactions where necessary (A7) | §8 transaction table | register, refresh-rotation, budget-create | Prisma `$transaction` | — | Integration tests assert atomicity (e.g., simulate failure mid-transaction) | 2–6 |
| Query optimization (A8) | §17, §21 | SQL aggregation in dashboard/reports | GROUP BY, indexed joins | — | Performance spot-check (query plan review) | 7–8 |
| Indexing (A9, optional) | §8, §21 | — | composite indexes on expenses/budgets | — | — | 2 |
| Stored procedures (A10, optional) | §21 — deliberately not implemented, justified | — | — | — | — | — |
| Unit tests, FE+BE (T1, weighted-optional) | §22 | — | — | — | Full suite | 11 |
| Deployment (D1, optional) | §28 | — | — | — | Smoke test | 13 |
| Source code, both sides (D2) | — | — | — | — | — | ongoing |
| README (D3) | §29 | — | — | — | — | 14 |
| Deployed URL (D4, optional) | §28 | — | — | — | — | 13 |

## 27. Definition of Done

A feature is **not** done because the code exists. It is done when, for that feature:

- Implementation matches the Section 11 API spec exactly (method, URL, status codes, response shape).
- Zod validation covers every field named in Section 19, with a corresponding negative-case test.
- Ownership/authorization is enforced at the repository layer (Section 10) and covered by a cross-user test (user A cannot touch user B's row).
- Standard error shape (Section 19) is returned on every failure path, not an unhandled 500.
- Frontend integration exists for every state in Section 14's table (loading, empty, error, success) — not just the happy path.
- At least one backend integration test and, where UI exists, one frontend test cover the feature.
- Responsive behavior verified at a mobile width and a desktop width where the feature has UI.
- The feature's row in Section 26 is fully filled in (no blank cells).
- `tsc --noEmit` passes with no `any` introduced to route around a type error.
- No secrets, credentials, or `.env` values are committed.

## 28. Deployment Plan

**Database:** a managed PostgreSQL instance (Neon, Supabase, or Render's managed Postgres — any give a connection string usable as `DATABASE_URL`). Run `prisma migrate deploy` (not `migrate dev`) against it, then the seed script once for any manually-created demo user only (real users get seeded at registration, Section 8).

**Backend:** deploy to Render or Railway (both support a Node service from a `Dockerfile` or buildpack). Required env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_EXPIRY=15m`, `REFRESH_TOKEN_EXPIRY_DAYS=30`, `COOKIE_DOMAIN`, `FRONTEND_ORIGIN` (for CORS), `NODE_ENV=production`.

**Frontend:** deploy to Vercel or Netlify as a static Vite build. Required env var: `VITE_API_URL` pointing at the deployed backend.

**Cross-origin cookie note:** if frontend and backend end up on different subdomains (typical for Vercel+Render), the refresh cookie needs `SameSite=None; Secure` instead of `Strict` for the browser to send it cross-site — this is a concrete, assignment-relevant detail to get right during deployment, called out here so it isn't discovered as a "login works locally but not in prod" bug.

**Steps, in order:** provision DB → set backend env vars → deploy backend → run `prisma migrate deploy` against the prod DB → verify `GET /health` → set frontend env var to the live backend URL → deploy frontend → set backend's `FRONTEND_ORIGIN` to the live frontend URL (CORS) → smoke test the full login→create-expense→dashboard flow against production.

**CI (optional but cheap to add):** a GitHub Actions workflow running `tsc --noEmit`, backend Jest suite (against a service-container Postgres), and frontend test suite on every push.

## 29. README Documentation Plan

- **Overview** — one paragraph, what the app does.
- **Tech stack** — table from Section 4.
- **Prerequisites** — Node version, PostgreSQL (or Docker), npm/pnpm.
- **Setup — backend** — clone, `npm install`, copy `.env.example` to `.env` and fill values, `prisma migrate dev`, `npm run dev`.
- **Setup — frontend** — clone/cd, `npm install`, copy `.env.example`, `npm run dev`.
- **Environment variables table** — every var from Section 28, with description and example (non-secret) value.
- **Database setup** — how migrations and seeding work, how to reset a local DB.
- **Running tests** — exact commands for backend and frontend suites.
- **API reference pointer** — link to Section 11 of this plan (or a generated OpenAPI doc, if added as a stretch item).
- **Folder structure** — the tree from Section 12/13.
- **Deployment** — summary of Section 28, or the live URL if deployed.
- **Known limitations** — single currency, no tablet-specific layout, synchronous report generation (Section 18's justified scope boundary), category deletion is archive-only.
- **License** (if applicable).

## 30. Final Evaluator Audit

**A. Mandatory requirements fully covered** Login/registration, JWT auth with refresh-token rotation, expense CRUD + filtering + pagination, budget CRUD with computed spent/remaining, SQL schema for users/expenses/budgets (plus the structurally-necessary categories/refresh_tokens tables), relational DB (PostgreSQL), monthly/yearly reports, CSV/Excel export, responsive mobile+desktop layout, React Hooks throughout, TypeScript on both sides, request validation, error handling, environment variables, transactions on the three operations identified in Section 8, query optimization via SQL-side aggregation, source code delivery, README.

**B. Optional requirements/enhancements** Charts/graphs (F9/A3), database indexing (A9 — implemented anyway, see Section 2), stored procedures (A10 — deliberately not implemented, justified in Section 21), automated test suite (T1 — implemented as "recommended" given its stated evaluation weight), deployment + live URL (D1/D4).

**C. Potential gaps or risks — named explicitly, not hidden**

- Category as a first-class entity, and archive-not-delete as its deletion semantics, are **engineering decisions inferred from stated requirements**, not requirements stated verbatim in the assignment (Sections 3, 7, 11). A different reasonable implementation could model categories as a free-text field — this plan judges that to be a worse fit for F2/F4/F5's referential needs, but it is a judgment call, flagged as such.
- Synchronous (non-queued) report generation (Section 18) is a scale assumption (single user, personal-finance data volumes) — explicitly would not hold at a different scale.
- No hard spending cap when an expense exceeds a budget (Section 16) — the assignment describes budgets as limits to track against, not enforce; this plan treats "block the expense" as out of scope rather than a missed requirement, but it's a reading, not a certainty.
- Stored procedures and DB-level indexing are marked optional by the assignment; indexing was still built (necessary for correctness at any real data volume), stored procedures were not (no query in this plan needs procedural logic that `$queryRaw`/application code doesn't already express cleanly) — if an evaluator specifically wants to see a stored procedure exercised, this is a gap.
- E2E test coverage (Section 22) lists representative scenarios, not an exhaustive enumeration of every filter/sort permutation — a real implementation should extend it as edge cases are discovered.
- Multi-currency, tablet layout, and shared/family budgets are out of scope (Section 3) by design, matching the assignment's own exclusions or silence — flagged in case the evaluator's expectations differ from the written brief.

## 31. Final Implementation Checklist

- Backend and frontend repos scaffolded, TypeScript strict mode on, linting configured.
- Prisma schema matches Section 8; migrations committed; seed script wired into registration.
- Auth: register, login, refresh (with rotation + reuse detection), logout, `/auth/me` all implemented and tested.
- Category CRUD implemented (archive, not hard delete, when expenses/budgets reference it).
- Expense CRUD implemented with date/category/amount filtering, sorting, and pagination.
- Budget CRUD implemented with server-computed `spent`/`remaining`/`percentUsed`, duplicate (category, month, year) rejected with `409`.
- Dashboard endpoint returns SQL-aggregated totals, remaining budget, and category summary — no client-side summation of raw rows.
- Monthly and yearly report endpoints implemented; CSV and Excel export both stream and both match the on-screen numbers exactly.
- Optional charts implemented if time allows, without blocking or replacing the required numeric summary.
- Every page has explicit loading, empty, error, and success states (Section 14).
- Responsive layout verified at a mobile width and a desktop width for every page; tablet intentionally left unhandled.
- Standard error response shape used everywhere; status codes match Section 19's table.
- Security checklist (Section 20) fully applied: bcrypt, short-lived JWT, httpOnly/Secure/SameSite refresh cookie, CORS whitelist, rate limiting on auth routes, no secrets committed.
- Backend integration tests cover every endpoint's happy path, validation failures, and cross-user ownership checks.
- Frontend tests cover forms, pages, and cache-invalidation behavior.
- (Optional) End-to-end suite covers the flows listed in Section 22.
- (Optional) App deployed; prod cookie `SameSite`/CORS settings verified against the real frontend/backend origins.
- README written per Section 29, including environment variable documentation.
- Section 26's traceability matrix has no blank cells against the final implementation.
- Section 30's audit re-run against the finished code, not just this plan.
