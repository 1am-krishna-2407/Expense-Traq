# Implementation Audit

This audit re-runs Plan §26 (traceability), §27 (definition of done), §30 (evaluator audit) and §31 (final checklist) **against the finished code**, not against the plan. Paths are relative to the repository root.

**Verification run** (local, Node 24, PostgreSQL 16 in Docker):

| Suite | Result |
|---|---|
| Backend `tsc --noEmit` (strict) · ESLint | ✅ 0 errors |
| Backend Jest — unit + API integration on real Postgres | ✅ **169 / 169** · 96% statements, 85% branches |
| Frontend `tsc -b` · ESLint | ✅ 0 errors |
| Frontend Vitest — components, pages, hooks, client (MSW) | ✅ **58 / 58** · 90% statements |
| Playwright E2E (desktop + Pixel 7) | ✅ **9 / 9** |
| Production builds (`tsc` → `dist/`, `vite build`) | ✅ |
| Backend Docker image | ✅ builds (`backend/Dockerfile`) |

---

## §26 Requirement traceability matrix — as built

| Req | Architecture / key code | API | DB | Frontend | Tests |
|---|---|---|---|---|---|
| **F1** Login/registration pages | `modules/auth/*` | `POST /auth/register`, `/auth/login` | `users` | `pages/LoginPage.tsx`, `pages/RegisterPage.tsx` | `auth.test.ts`; `pages.test.tsx › Auth routing`; E2E *register → empty dashboard* |
| **F2** Dashboard totals / remaining / category summary | `dashboard.service.ts` → `expensesRepository.categoryBreakdown` (single SQL join) | `GET /dashboard/summary` | expenses, budgets, categories | `pages/DashboardPage.tsx` | `dashboard.test.ts` (manually computed totals), `dashboard.calc.test.ts`; `pages.test.tsx › Dashboard` |
| **F3** Add / edit / delete expense | `expenses.service.ts` | `POST/PATCH/DELETE /expenses` | expenses | `ExpenseFormModal.tsx`, `ExpensesPage.tsx` (optimistic delete) | `expenses.test.ts`; `ExpenseFormModal.test.tsx`; `hooks.test.tsx`; E2E *edit/delete recompute* |
| **F4** Filter by date / category / amount | `expensesRepository.list` (AND-combined, indexed) | `GET /expenses?…` | `(user_id, expense_date)`, `(user_id, category_id)` indexes | `ExpenseFilterBar.tsx` (inline bar + mobile sheet) | `expenses.test.ts › filter/sort/paginate`; `pages.test.tsx › Expenses`; E2E *filter expenses* |
| **F5** Monthly budget per category | `budgets.service.ts` | `POST /budgets` | `budgets` + unique `(user,cat,month,year)` | `BudgetsPage.tsx`, `BudgetFormModal.tsx` | `budgets.test.ts` incl. concurrent duplicate race; `pages.test.tsx › Budgets` (409 → category field) |
| **F6** Edit / delete budget limits | `budgets.service.ts` (limit-only PATCH) | `PATCH/DELETE /budgets/:id` | budgets | `BudgetsPage.tsx` | `budgets.test.ts › GET/PATCH/DELETE` |
| **F7** Monthly & yearly reports | `reports.service.ts` | `GET /reports/monthly`, `/yearly` | expenses, budgets, categories | `ReportsPage.tsx` | `reports.test.ts` (Jan 31/Feb 1, Dec 31/Jan 1 boundaries); `pages.test.tsx › Reports` |
| **F8** CSV / Excel export | `utils/export.ts` (fast-csv + exceljs streaming writers) fed by `reportsService.exportTables` | `GET /reports/export` | — | Export buttons with in-progress spinners | `reports.test.ts` (parses CSV **and** XLSX, compares to on-screen JSON); E2E *CSV download matches screen* |
| **F9** Charts (opt.) | `components/charts/Charts.tsx`, lazy + error boundary | reuses `monthlyTrend`, `byDay`, `byMonth` | — | trend, donut, daily bars, budget-vs-actual | Rendered in page tests; visual capture |
| **F10** Responsive mobile + desktop | Tailwind breakpoints; `ResponsiveTable` (table ↔ cards from one column config); bottom tab bar + drawer | — | — | `components/layout/AppLayout.tsx` | E2E `@mobile-only` (no horizontal overflow at Pixel 7); visual QA screenshots |
| **B1** JWT auth | `utils/tokens.ts` (HS256 pinned), `middleware/authenticate.ts` | all protected routes | — | `context/AuthContext.tsx` | `tokens.test.ts` (expired / tampered / alg:none); `auth.test.ts › authenticate` |
| **B2** Register / login endpoints | `auth.controller.ts` | `/auth/register`, `/auth/login` | users | — | `auth.test.ts` |
| **B3** Refresh tokens | `auth.service.refresh` + `authRepository.rotateRefreshToken` | `POST /auth/refresh` | `refresh_tokens` | `api/client.ts` interceptor (de-duplicated) | `auth.test.ts` (rotation, reuse revokes family, concurrent, expired); `client.test.ts`; E2E *reload persists* |
| **B4** Expense CRUD endpoints | `modules/expenses/*` | full EXPENSES block | expenses | — | `expenses.test.ts` |
| **B5** Budget CRUD endpoints | `modules/budgets/*` | full BUDGETS block | budgets | — | `budgets.test.ts` |
| **B6** Schema: users / expenses / budgets | `prisma/schema.prisma` | — | + categories, refresh_tokens | — | migration applied in every test run; drift check `prisma migrate diff` = empty |
| **B7** Relational DB | PostgreSQL 16 | — | — | — | — |
| **A1** Hooks used effectively | TanStack Query hooks per feature, RHF, custom `useDebouncedValue`, context hooks | — | — | `features/*/hooks.ts` | `hooks.test.tsx` (cache invalidation + optimistic delete) |
| **A2** TS interfaces for props/state | typed DTOs mirrored in `api/types.ts` | — | Prisma-generated types | typed props everywhere; `no-explicit-any` = error | `tsc` strict in CI |
| **A3** Charting library (opt.) | Recharts | — | — | — | — |
| **A4** Validation & error handling | `middleware/validate.ts` (Zod), `middleware/errorHandler.ts` (standard shape) | every endpoint | CHECK constraints (defence in depth) | RHF + Zod schemas mirrored from backend (`features/schemas.ts`) | negative cases in every module test |
| **A5** TypeScript backend | strict `tsconfig.json` | — | — | — | `npm run typecheck` |
| **A6** Env vars | `config/env.ts` (Zod, fails loudly) | — | `DATABASE_URL` | `VITE_API_URL` | `env.test.ts` |
| **A7** Transactions | register + seed categories; refresh rotation; budget check-and-insert | — | `prisma.$transaction` | — | `auth.test.ts › is atomic` (simulated failure mid-transaction); concurrent budget race; concurrent refresh |
| **A8** Query optimisation | SQL `SUM/GROUP BY`; sargable date ranges; `include` for joins (no N+1); pagination ≤ 100 | — | composite indexes | TanStack `staleTime`; lazy chart chunk | aggregation tests |
| **A9** Indexing (opt., built) | `(user_id, expense_date)`, `(user_id, category_id)`, `(user_id, year, month)` + unique indexes | — | migration | — | — |
| **A10** Stored procedures (opt.) | **Not implemented, by design** (Plan §21) | — | — | — | — |
| **T1** Unit tests FE + BE | Jest, Vitest, Playwright | — | — | — | 169 + 58 + 9 |
| **D1/D4** Deployment (opt.) | `backend/Dockerfile`, `render.yaml`, `frontend/vercel.json`, `netlify.toml`, CI workflow | — | — | — | **Configured; not deployed** — needs your hosting accounts |
| **D2** Source code | this repository | | | | |
| **D3** README | `README.md` (every §29 section) | | | | |

Every cell traces to real code or a real test, apart from **A10**, which was consciously not built, and **D1/D4**, which are ready to deploy but not live.

---

## §27 Definition of done — per feature

| Check | Status |
|---|---|
| Matches the §11 spec (method, URL, status codes, shape) | ✅ The additive fields and the `search` filter are listed in the README |
| Zod on every field, each with a negative-case test | ✅ |
| Ownership at the repository layer + a cross-user test | ✅ Every module has *“returns 404 for another user's …”* tests |
| Standard error shape on every failure path | ✅ Includes malformed JSON, unknown routes, rate limits and unhandled errors |
| Loading / empty / error / success states in the UI | ✅ Every page (see `pages.test.tsx`) |
| Backend integration test + frontend test per feature | ✅ |
| Responsive at a mobile and a desktop width | ✅ E2E Pixel 7 + 1440 px screenshots |
| `tsc --noEmit` passes with no `any` | ✅ `no-explicit-any` is an error in both projects |
| No secrets committed | ✅ `.env` files are git-ignored; only `.env.example` is tracked |

---

## §30 Final evaluator audit — re-run against the code

**A. Mandatory requirements: all covered.** Every F, B and A row marked R in Plan §2 has working code and passing tests (see the matrix above).

**B. Optional items**

| Item | Status |
|---|---|
| Charts (F9/A3) | Built: trend, donut, daily bars, budget-vs-actual |
| Indexing (A9) | Built |
| Automated tests (T1) | Built at all three levels |
| Stored procedures (A10) | Not built (justified in Plan §21) |
| Deployment (D1/D4) | Configured, not executed |

**C. Gaps and risks, stated honestly**

- **Engineering decisions the plan flagged as judgement calls are implemented as planned:**
  - Category is a real entity.
  - `DELETE /categories` archives rather than deletes.
  - Budgets never block an expense.
  - Reports run synchronously.
- **No live deployment URL (D4).** Deploying requires accounts on Render and Vercel or Netlify, which only you can create. The README lists the exact steps.
- **Stored procedures (A10) are absent.** If an evaluator specifically wants one, this is the gap.
- **Case-insensitive uniqueness uses expression indexes** (`lower(email)`, `lower(name)`), which Prisma's schema language can't express. They live in the hand-edited initial migration. A future `prisma migrate dev` may propose dropping them, so review generated migrations before applying.
- **Refresh-token reuse detection is strict.** Two different tabs refreshing in the same instant can sign each other out. Within one tab, refreshes are de-duplicated.
- **The E2E suite covers the §22 scenarios**, not every filter or sort permutation. Those permutations are covered at the API level in `expenses.test.ts`.
- **Local `prisma migrate reset` is gated.** Prisma blocks AI-initiated resets, so the test harness uses `migrate deploy` plus table truncation, guarded to databases named `*_test`.

**Additions beyond the plan (UX, not scope creep):**
- light and dark themes, matching both design references
- global month picker and top-bar search
- a live password checklist
- a "safe to spend per day" figure on budget cards
- an "Unbudgeted categories" panel with one-click "Set limit"

---

## §31 Final implementation checklist

- [x] Backend and frontend scaffolded, TypeScript strict mode on, linting configured.
- [x] Prisma schema matches §8. The migration is committed, and the seed is wired into registration (same transaction).
- [x] Auth: register, login, refresh (rotation + reuse detection), logout and `/auth/me` implemented and tested.
- [x] Category CRUD implemented; delete archives instead of hard-deleting.
- [x] Expense CRUD with date/category/amount filtering, sorting and pagination.
- [x] Budget CRUD with server-computed spent/remaining/percentUsed; duplicate (category, month, year) → 409.
- [x] Dashboard returns SQL-aggregated totals, remaining budget and category summary, with no client-side summation of raw rows.
- [x] Monthly and yearly reports; CSV and Excel exports both stream and match the on-screen numbers (verified by parsing both formats in tests).
- [x] Optional charts implemented without blocking the numeric summary (lazy-loaded behind an error boundary).
- [x] Every page has explicit loading, empty, error and success states.
- [x] Responsive layout verified at a phone width and a desktop width for every page; tablet intentionally not tailored.
- [x] Standard error shape everywhere; status codes follow §19 (400/401/404/409/429/500; 403 and 422 unused).
- [x] Security checklist (§20): bcrypt(12), 15-minute pinned-alg JWT, httpOnly + SameSite + path-scoped refresh cookie (Secure in production), CORS whitelist, rate limiting on auth routes, redacted logs, secrets not committed, env validated at boot.
- [x] Backend integration tests cover every endpoint's happy path, validation failures and cross-user ownership.
- [x] Frontend tests cover forms, pages and cache-invalidation behaviour.
- [x] (Optional) E2E suite covers the §22 flows.
- [ ] (Optional) App deployed with production SameSite/CORS verified against real origins. **Deployment config is ready (Docker, Render, Vercel/Netlify, CI), but it isn't live yet because it needs your hosting accounts.**
- [x] README written per §29, including environment variable docs.
- [x] §26 traceability matrix has no blank cells (above).
- [x] §30 audit re-run against the finished code (above).
