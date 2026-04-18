# ProactiveUI

**Intent-aware writing & analysis co-pilot — the document is the interface.**

AI writing tools today are chat-first: users leave the document, describe their
intent in a chat window, copy the result back, and iterate. ProactiveUI flips
that. The system infers intent from what you're already writing — plan comments
in Python, prose in LaTeX — and surfaces relevant AI actions inline. Nothing
mutates the document without your approval.

🔗 **Live app:** https://proactiveui.vercel.app
👥 **Team:** Zhiping Zhang, Qiushi Liang
📄 **Product spec:** [PRD.md](./PRD.md)

---

## Try it in 30 seconds

1. Open https://proactiveui.vercel.app and sign up (username + password only —
   no OAuth, no email verification).
2. Three demo files are waiting: `demo_plan.py`, `demo_paper.tex`,
   `customers.csv`.
3. Open `demo_plan.py` and hover on any line for **1.5 seconds**.
4. A floating panel appears with 2–4 context-aware actions.
5. Click one → an agent card appears in the right sidebar with an animated
   thinking log. For artifact actions, a draft block is inserted into the
   editor.
6. Approve / Undo / Dismiss from the card — or click the card to jump the
   editor back to the origin line.

---

## Interaction model

```
┌────────────┬──────────────────────────┬────────────────┐
│  FILES     │   Monaco editor          │   AGENTS       │
│            │                          │                │
│ + New .py  │   (selected file)        │  🤖 Write Code │
│ + New .tex │                          │   [Approve]    │
│ ⬆ Import   │   ← floating intent      │   [Undo]       │
│            │     panel appears        │                │
│ file1.py   │     on 1.5s hover or     │                │
│ paper.tex  │     text selection       │                │
│ data.csv   │                          │                │
└────────────┴──────────────────────────┴────────────────┘
       left              center                right
```

- **Left** — file list. Create new `.py` / `.tex` files, import local
  `.py` / `.tex` / `.csv`, switch between files, delete with ×.
- **Center** — Monaco editor. Auto-saves on edit (1 s debounce). CSVs open
  in plaintext mode and don't trigger intent (they're data, not prose/code).
- **Right** — agents for the current file. Each card shows action label,
  quoted origin text, animated thinking steps, summary, and Approve / Undo /
  Dismiss. Click anywhere on a card to jump the editor to the origin line.

### The 8 actions

| ID                       | Label                 | Trigger          | Output                                 |
| ------------------------ | --------------------- | ---------------- | -------------------------------------- |
| `writeCode`              | Write Code            | Python step      | Artifact: code block below the comment |
| `detailStep`             | Detail Step           | Python step      | Artifact: expanded plan                |
| `exploreAlternative`     | Explore Alternative   | Python goal/step | Result: summary in card only           |
| `improveComment`         | Revise                | Python freeform  | Artifact: rewritten comment            |
| `fixGrammar`             | Fix Grammar           | LaTeX prose      | Artifact: corrected text               |
| `rewriteAcademic`        | Rewrite Academic      | LaTeX prose      | Artifact: academic voice rewrite       |
| `expandParagraph`        | Expand Paragraph      | LaTeX prose      | Artifact: expanded paragraph           |
| `summarizeUnderstanding` | Reflect Understanding | LaTeX goal       | Result: summary in card only           |

### Two roles

`WRITER` creates documents and triggers actions. `REVIEWER` can read any
document and approve / undo any agent, but cannot edit document content.
Role is set per user in the `User.role` column.

---

## Tech stack

| Layer     | Choice                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 15 (App Router) + React 19                                                                                                 |
| Language  | TypeScript strict                                                                                                                  |
| Styling   | Tailwind CSS                                                                                                                       |
| Auth      | Auth.js v5 (NextAuth) with Credentials provider — bcrypt, JWT session, no OAuth, no forgot-password                                |
| Database  | PostgreSQL (Neon in production) via Prisma 6                                                                                       |
| Editor    | `@monaco-editor/react`                                                                                                             |
| LLM       | `@anthropic-ai/sdk` (`claude-3-5-haiku-latest`) for intent classification; rule-based `mockIntentAnalyzer` is a permanent fallback |
| Testing   | Vitest (unit) + Playwright (E2E)                                                                                                   |
| Deploy    | Vercel, Postgres via Neon integration                                                                                              |
| CI        | GitHub Actions                                                                                                                     |

**Mock and live paths are peers, not a ladder.** `analyzeIntent` always
falls back to the rule-based analyzer when the Anthropic call fails or the
key is missing. Any new live functionality must have an equivalent mock
path so the app is always demoable without a billable key.

---

## Architecture

```
┌─────────────────────────┐
│  Browser (Next.js page) │
│   - Monaco editor       │
│   - FloatingIntentPanel │
│   - AgentSidebar        │
└──────────┬──────────────┘
           │ fetch
           ▼
┌─────────────────────────┐      ┌──────────────────────────┐
│  Next.js API routes     │──▶──▶│  Anthropic Claude Haiku  │
│   - /api/intent         │      │   (optional; falls back  │
│   - /api/agents         │      │    to mockIntentAnalyzer)│
│   - /api/documents      │      └──────────────────────────┘
│   - /api/auth/*         │
└──────────┬──────────────┘
           │ Prisma Client
           ▼
┌─────────────────────────┐
│  Neon PostgreSQL        │
│   User · Document       │
│   Agent                 │
└─────────────────────────┘
```

Full architecture notes in [`docs/architecture.md`](./docs/architecture.md).
Security posture in [`docs/security.md`](./docs/security.md).

### Project layout

```
src/
├── app/
│   ├── page.tsx              — landing (Sign in / Sign up CTAs)
│   ├── sign-in/, sign-up/    — Auth.js forms
│   ├── dashboard/page.tsx    — 3-column dashboard
│   └── api/
│       ├── intent/           — POST: classify line / selection
│       ├── agents/           — GET list, POST create, PATCH approve/undo, DELETE
│       ├── documents/        — GET list, POST create, PATCH save, DELETE, /seed
│       └── auth/             — Auth.js + /signup
├── components/
│   ├── Editor/               — Monaco wrapper, FloatingIntentPanel, IntentPanel
│   ├── Files/FileList.tsx    — left column
│   ├── Sidebar/AgentCard.tsx, AgentSidebar.tsx — right column
│   └── auth/SignOutButton.tsx
├── lib/
│   ├── core/                 — framework-agnostic domain logic, all unit-tested
│   │   ├── sessionStats.ts
│   │   ├── mockIntentAnalyzer.ts
│   │   ├── intentService.ts  — Anthropic + mock fallback chain
│   │   ├── agentManager.ts   — thinking / summary / artifact builders
│   │   └── seedDocuments.ts
│   ├── llm/anthropicIntentClient.ts — server-only SDK client
│   ├── auth/getCurrentUser.ts
│   └── editor/artifactOps.ts — Monaco insert / approve / undo / focusLine
├── hooks/useIntentTriggers.ts — 1.5s dwell + 400ms selection debounce
├── types/                    — shared types
└── auth.ts, middleware.ts

prisma/
├── schema.prisma             — User, Document, Agent + enums

e2e/                          — Playwright tests
legacy/                       — original VS Code extension (reference only)
docs/                         — sprint docs, standups, security, architecture,
                                MCP retrospective, HW deliverables
.claude/                      — hooks, skills, agents, MCP, settings
.github/workflows/            — CI + Claude AI PR review
```

---

## Local development

### Prerequisites

- Node.js 22 (the `engines` warning on Node 20 is benign but pin 22 for CI
  parity).
- A Postgres database. Local Postgres works; easiest is a free
  [Neon](https://neon.tech) project that matches production.

### Setup

```bash
git clone https://github.com/ZhipingZhangArya/proactiveui-extension.git
cd proactiveui-extension
npm install                     # also runs `prisma generate`
cp .env.example .env.local
```

Fill `.env.local`:

```bash
AUTH_SECRET=$(openssl rand -hex 32)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...    # optional; app works without it
PROACTIVEUI_DEV_BYPASS_AUTH=1   # optional; skip sign-in while developing UI
```

Apply the schema to your local DB:

```bash
npx prisma db push              # or `npx prisma migrate dev` if you want migrations
```

Run:

```bash
npm run dev                     # http://localhost:3000
```

### Commands

```bash
npm run dev            # Next.js dev server
npm run build          # production build
npm run start          # production server (after build)

npm run lint           # ESLint (flat config)
npm run format         # Prettier --write
npm run format:check   # Prettier --check (CI uses this)
npm run type-check     # tsc --noEmit

npm test               # Vitest (50 unit tests)
npm run test:watch     # Vitest in watch mode
npm run test:e2e       # Playwright E2E (Chromium, 2 tests)
npm run test:e2e:ui    # Playwright UI mode

npx prisma studio      # visual DB browser
npx prisma migrate dev --name <desc>   # create + apply a migration
```

---

## Deployment

Production deploys to Vercel on every merge to `main`. Preview deploys on
every PR. Required environment variables on Vercel:

- `AUTH_SECRET` — 32-byte hex
- `DATABASE_URL` — Neon direct (non-pooled) URL
- `ANTHROPIC_API_KEY` — optional

Vercel build command:

```
npx prisma generate && npx prisma db push --accept-data-loss && next build
```

For a stable-release workflow we would switch to `prisma migrate deploy`
instead of `db push`; `db push` is pragmatic for the current prototype.

---

## Development workflow

### Test-first for pure logic

Everything in `src/lib/core/` and `src/lib/llm/` must have matching
`__tests__/*.test.ts`. New behaviour follows a strict red → green →
refactor cycle with one commit per phase. See the
[`tdd-feature`](./.claude/skills/tdd-feature/SKILL.md) skill for the rule
and worked examples from git history.

### Claude Code integration

- **Hooks** (`.claude/settings.json`): Prettier auto-formats edited files;
  Stop hook runs `npm test` at the end of every session.
- **Skills** (`.claude/skills/`): `tdd-feature` (v2 with worked example)
  and `prisma-migration`.
- **Sub-agent** (`.claude/agents/`): `security-reviewer` runs an
  OWASP-flavoured review on diffs.
- **MCP servers** (`.mcp.json`, gitignored): `github` for issue/PR
  management and `vercel` for deploy diagnosis during development.

### Conventions

- **No `any`.** Use `unknown` + narrowing for untrusted input.
- **Zod at every API boundary.** See `src/app/api/intent/route.ts` and
  `src/app/api/auth/signup/route.ts` for the pattern.
- **Auth on every private route.** Every `/api/**` handler except
  `/api/auth/**` calls `getCurrentUser()` or returns 401.
- **Folder ownership.** `lib/core/` stays framework-agnostic; `lib/llm/`
  holds server-only SDK clients; `app/api/**` is thin zod-validated glue
  calling into `lib/`.

### CI pipeline

`.github/workflows/ci.yml` runs on every push and PR:

1. Lint + Prettier
2. TypeScript type-check
3. Vitest unit tests
4. Playwright E2E
5. Security scan (`npm audit` + Gitleaks)
6. Next.js build

`.github/workflows/claude-review.yml` runs
[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)
on every PR to leave a structured C.L.E.A.R.-framed review. Also
triggerable on-demand by commenting `/claude review`.

---

## Security

See [`docs/security.md`](./docs/security.md) for the OWASP Top 10 mapped
to this codebase. Headlines:

- Passwords hashed with bcrypt (10 rounds). JWT sessions signed with a
  32-byte `AUTH_SECRET`.
- Prisma parameterises every query. No `$queryRaw` with user input.
- `.mcp.json` and `.env*` are gitignored; Gitleaks scans the full history
  on every push.
- `npm audit --audit-level=high` blocks CI on high/critical vulns.
- No `$queryRaw`, no eval, no unvalidated redirects.
- Rate limiting on `/api/auth/*` is a known gap (Vercel platform throttle
  is the current baseline).

---

## Legacy

The original VS Code extension lives under [`legacy/`](./legacy/) — do
not modify. All working source has been ported to the Next.js app; the
extension is kept as reference for the product concept and for
code-reuse auditing.
