# Architecture — ProactiveUI web app

Imported from `CLAUDE.md`. Keep in sync with the code; if it ever
drifts, trust the code and fix this doc.

## High-level diagram

```
┌─────────────────────────┐
│  Browser (dashboard UI) │
│   - Monaco editor       │
│   - IntentPanel         │
│   - SignOutButton       │
└──────────┬──────────────┘
           │ fetch /api/intent
           ▼
┌─────────────────────────┐      ┌──────────────────────────┐
│  Next.js API routes     │──▶──▶│  Anthropic Claude Haiku  │
│   - /api/intent         │  (opt. live intent)             │
│   - /api/auth/*         │                                  │
│   - /api/auth/signup    │      └──────────────────────────┘
└──────────┬──────────────┘
           │ Prisma Client
           ▼
┌─────────────────────────┐
│  PostgreSQL             │
│   (Vercel Postgres)     │
│   User / Document /     │
│   Agent                 │
└─────────────────────────┘
```

## Request lifecycle — Intent detection

1. User clicks **Analyze current line** in the dashboard.
2. `DashboardPage` reads the current Monaco line text + cursor range.
3. Client POSTs JSON to `/api/intent`.
4. `middleware.ts` applies Auth.js + dev bypass rules.
5. Route handler validates body with zod.
6. `getCurrentUser()` resolves the session (Auth.js JWT).
7. `analyzeIntent()` (server-only):
   - If `ANTHROPIC_API_KEY` set → call Anthropic Haiku.
   - On failure or missing key → `mockIntentAnalyzer`.
8. Response: `IntentSuggestion` JSON.
9. `IntentPanel` renders actions.

## Directory conventions

| Directory               | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `src/app/`              | Next.js App Router — pages and API route handlers     |
| `src/components/`       | React components, Tailwind classNames                 |
| `src/lib/core/`         | Framework-agnostic domain logic; must have tests      |
| `src/lib/llm/`          | External SDK clients (Anthropic); server-only imports |
| `src/lib/auth/`         | Auth.js helpers (`getCurrentUser`, role checks)       |
| `src/types/`            | Shared types + module augmentations                   |
| `prisma/`               | Schema + generated migrations                         |
| `e2e/`                  | Playwright tests                                      |
| `legacy/`               | Original VS Code extension — reference only           |
| `.claude/agents/`       | Sub-agent definitions                                 |
| `.claude/skills/`       | Developer skills (e.g. `tdd-feature`)                 |
| `.claude/settings.json` | Permissions + hooks (PostToolUse, Stop)               |

## Server vs client boundaries

- **Server only**: `src/lib/llm/*`, `src/lib/db.ts`, any file under
  `src/app/api/**`, and `src/auth.ts`. These access secrets and the DB.
- **Client only**: `src/app/**/page.tsx` files marked `"use client"`,
  everything under `src/components/`. Never import server-only modules
  here.
- **Shared**: `src/types/*`, `src/lib/core/*`. Pure functions and types
  only. If a file in `lib/core/` ever needs a server-only import, move
  it to `lib/server/` and split the types out.

## State management

- Session: Auth.js JWT cookie + `SessionProvider` in
  `src/components/Providers.tsx`.
- Agents (pending): in-memory ref during the current UX; will migrate
  to Prisma-backed once artifact execution lands.
- Intent results: local React state in `DashboardPage` — transient.

## Build & deploy

- `npm run build` → `.next/` standalone output.
- Vercel picks up the repo, runs `npm install && npx prisma generate &&
npm run build`, and serves the result. `DATABASE_URL`, `AUTH_SECRET`,
  and `ANTHROPIC_API_KEY` must be set as project env vars.
- Preview deploys on every PR; production on merge to `main`.
