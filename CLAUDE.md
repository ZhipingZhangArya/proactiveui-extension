# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Imports

Load project-level references before planning any change:

- @PRD.md — authoritative product requirements (VS Code extension era; the web port preserves the same product concept)
- @docs/architecture.md — web app structure and conventions
- @docs/security.md — OWASP Top 10 notes that apply here

## Project snapshot

**ProactiveUI: Intent-Aware Writing and Analysis Co-Pilot**
Team: Zhiping Zhang, Qiushi Liang

This started life as a VS Code extension (preserved under `legacy/` for
reference and code reuse). It is now migrating to a **Next.js web app**
so users can write Python / LaTeX in a browser Monaco editor and get
the same intent-aware AI suggestions without installing an extension.

Two user roles live in the Prisma schema: `WRITER` (creates documents,
triggers actions) and `REVIEWER` (reads any document, approves/undoes
artifacts). Artifact execution is still WIP — the intent classification
path (line / selection → semantic type + suggested actions) is fully
wired end-to-end.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS** for styling
- **Auth.js v5** (NextAuth) with a Credentials provider —
  username + password only, bcrypt-hashed, no OAuth, no forgot-password
- **Prisma 6** + **PostgreSQL** (Vercel Postgres in production)
- **@monaco-editor/react** for the in-browser editor
- **@anthropic-ai/sdk** for intent classification (`claude-3-5-haiku-latest`);
  mock analyzer is always a first-class fallback
- **Vitest** for unit tests, **Playwright** for E2E

Deploy target: **Vercel**. CI: **GitHub Actions** (lint, type-check,
unit tests, E2E, security scan, build).

## Commands

```bash
npm install            # install deps (also runs `prisma generate`)
npm run dev            # start Next.js dev server on :3000
npm run build          # production build
npm run lint           # ESLint (flat config)
npm run format         # Prettier --write
npm run format:check   # Prettier --check (CI uses this)
npm run type-check     # tsc --noEmit
npm test               # Vitest (35 unit tests)
npm run test:watch     # Vitest in watch mode
npm run test:e2e       # Playwright E2E (3 tests on Chromium)
npx prisma migrate dev --name <desc>   # create + apply a migration
```

Environment variables (see `.env.example`):
`AUTH_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY` (optional), and a
dev-only `PROACTIVEUI_DEV_BYPASS_AUTH=1` flag for demoing without a DB.

## Architecture

### Data flow

1. User writes Python or LaTeX in the Monaco editor on `/dashboard`.
2. User clicks **Analyze current line** or **Analyze selection**.
   The dashboard page grabs the line/selection from the Monaco
   editor instance and POSTs it to `/api/intent`.
3. `POST /api/intent` validates the body with zod, authenticates via
   `getCurrentUser()` (Auth.js session, or the dev bypass), then
   delegates to `analyzeIntent` in `src/lib/core/intentService.ts`.
4. `analyzeIntent` tries `AnthropicIntentClient.inferIntent()` if
   `ANTHROPIC_API_KEY` is set; on failure or missing key it falls
   back to the rule-based `mockIntentAnalyzer`.
5. The API returns an `IntentSuggestion` object; the dashboard shows
   it in the sidebar with clickable action buttons.
6. Clicking an action will (once the DB is wired) create an `Agent`
   row and stream "thinking" steps back to the client — currently a
   stub handler.

### Key directories

- `src/app/` — Next.js App Router: pages (`page.tsx`, `layout.tsx`)
  and API routes (`api/**/route.ts`)
- `src/components/` — React components (Editor, auth, Providers)
- `src/lib/core/` — framework-agnostic domain logic (intent analyzers,
  session stats); every module has a matching `__tests__/*.test.ts`
- `src/lib/llm/` — Anthropic SDK client (server-side only)
- `src/lib/auth/` — Auth.js helpers including the dev bypass
- `src/types/` — shared types (`proactive.ts`, `next-auth.d.ts`)
- `prisma/` — schema + migrations
- `e2e/` — Playwright tests
- `legacy/` — original VS Code extension source; DO NOT modify here,
  use it only as a reference

### Key types (`src/types/proactive.ts`)

- `ActionId` — 8 IDs: `writeCode`, `detailStep`, `exploreAlternative`,
  `improveComment`, `fixGrammar`, `rewriteAcademic`, `expandParagraph`,
  `summarizeUnderstanding`
- `SemanticType` — `goal | step | freeform`
- `FileLanguage` — `python | latex`
- `AgentRecord` / `ArtifactState` — mirror the Prisma schema

## Conventions

**Adding a new action** touches three places (four once artifact
execution lands):

1. `ActionId` union in `src/types/proactive.ts`
2. `ACTION_BY_ID` map + allowlist in
   `src/lib/llm/anthropicIntentClient.ts`
3. Mock analyzer logic in `src/lib/core/mockIntentAnalyzer.ts`
4. (Future) `AgentManager.buildArtifact / buildSummary / ...`
   once the DB-backed agent manager is in place

**Mock and live paths are permanent peers.** `intentService` always
falls back to the mock analyzer when the Anthropic call fails. Any new
live functionality must have an equivalent mock path.

**TDD is required in `src/lib/core/`.** Use the `tdd-feature` skill —
one commit per phase:
`test(red): ...` → `feat(green): ...` → `refactor: ...`.
See git log for examples: `c48e535`, `6f6be87`, etc.

**Auth.** Every route under `/api/` except `/api/auth/*` calls
`getCurrentUser()`. The middleware handles the `/dashboard/*` and
page-level redirect. Dev bypass is `PROACTIVEUI_DEV_BYPASS_AUTH=1`,
active only when `NODE_ENV !== "production"` — never leaves dev.

**No `any`.** Strict TypeScript. Use `unknown` + narrowing for
untrusted input; use explicit generics for typed lookups.

**Floating promises:** the codebase uses `await` or
`void fireAndForget()`. ESLint's no-floating-promises rule flags
unintentional ones.

**Folder ownership:**

- `src/lib/core/` — stateful domain logic (pure, no Next.js imports)
- `src/lib/llm/` — external SDK clients (server-only)
- `src/app/api/**` — request/response glue; zod-validated; calls into `lib/`
- `src/app/**/page.tsx` — React pages
- `src/components/` — reusable UI

## Security

See `@docs/security.md` for the OWASP Top 10 applied to this project.
Quick checklist for any change:

- **A01 Broken Access Control** — every `/api/**` route (except
  `/api/auth/**`) calls `getCurrentUser()` or returns 401. Routes that
  load records by ID scope by `userId: session.user.id` unless the
  user is a `REVIEWER`.
- **A02 Cryptographic Failures** — passwords hashed with `bcrypt`
  (10 rounds). Session tokens are Auth.js JWT signed with `AUTH_SECRET`
  (32-byte hex). Never log credentials or tokens.
- **A03 Injection** — Prisma parameterizes queries. No `$queryRaw`
  with user input without `Prisma.sql` templates.
- **A05 Security Misconfiguration** — `.mcp.json` and `.env*` are
  gitignored; see `.gitleaks.toml` for secret-scanning config.
- **A07 Identification / Auth Failures** — usernames are 3-32 chars,
  passwords ≥ 6; enforced both in API handlers (zod) and the signup
  form HTML constraints.

Security gates in CI:

1. `npm audit --audit-level=high` blocks on high/critical vulns
2. `gitleaks-action` scans the full git history for secrets
3. `security-reviewer` sub-agent (`.claude/agents/`) reviews diffs
4. OWASP-linked `docs/security.md` is part of the DoD for PRs

## Testing strategy

- **Pure logic** (`src/lib/core/`, `src/lib/llm/`) uses **Vitest**
  with per-module `__tests__/` folders. Current count: 35 tests.
- **API routes** — plan is to add integration tests using `next/server`
  mocks + a Prisma in-memory adapter.
- **UI flow** — **Playwright** E2E in `e2e/`. Currently covers:
  landing CTA, Python intent end-to-end, LaTeX language toggle.
- **Coverage target**: 70%+ on `src/lib/`. CI will enforce this once
  the API route tests land.

Pre-demo smoke test (5 paths), same as the VS Code version but ported:

1. Sign in works (once the DB is provisioned)
2. Dashboard loads with seed Python document
3. Analyze current line on `# Step 1: load...` → step + 3 actions
4. Switch to LaTeX → editor swaps document
5. Analyze LaTeX line with `\\section{Introduction}` → goal + 2 actions

## Do's and Don'ts

- **Do** store the Anthropic API key exclusively in env vars
  (Vercel project settings or `.env.local`). Never commit it.
- **Do** keep `legacy/` untouched — it is reference only.
- **Don't** reintroduce a third-party framework to the sidebar UI —
  inline React components + Tailwind are intentional.
- **Don't** add `any`. Prefer `unknown` + narrowing.
- **Don't** call Anthropic from a client component — always go
  through `/api/intent` so the key stays server-side.
- **Don't** bypass Auth.js in production paths; `getCurrentUser()`
  is the single source of truth.
