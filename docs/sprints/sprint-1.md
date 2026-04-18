# Sprint 1 — Foundation

**Dates:** 2026-04-05 → 2026-04-17 (kickoff → end-of-sprint review)
**Team:** Zhiping Zhang, Qiushi Liang

## Sprint goal

Migrate ProactiveUI from a VS Code extension to a deployable Next.js
full-stack app with username/password auth, the Monaco editor, and
the intent-detection feature working end-to-end against the existing
mock analyzer.

## Planned stories

| ID  | Story                                                                      | Owner   | Acceptance criteria                                                           |
| --- | -------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| S1  | Scaffold Next.js App Router project in the existing repo                   | Zhiping | `npm run dev` serves `/` landing page with ProactiveUI branding               |
| S2  | Move VS Code extension to `legacy/` without losing history                 | Zhiping | `git log --follow` on a moved file shows the original commits                 |
| S3  | Add Auth.js Credentials (username + password, no OAuth, no forgot flow)    | Zhiping | Can register, sign in, hit a protected route; no Google button anywhere       |
| S4  | Prisma schema for User / Document / Agent with matching Role + enums       | Zhiping | `npx prisma generate` succeeds; schema covers writer + reviewer workflows     |
| S5  | Dashboard shell with Monaco editor + language toggle (Python / LaTeX)      | Zhiping | `/dashboard` renders editor with seed content for both languages              |
| S6  | Port `SessionStats`, `mockIntentAnalyzer`, `AnthropicIntentClient` to src/ | Zhiping | All 24 legacy tests still pass after port; no `vscode.*` imports remain       |
| S7  | `POST /api/intent` + end-to-end wiring to "Analyze current line" button    | Zhiping | Clicking Analyze surfaces the correct step/goal classification + action chips |
| S8  | Set up GitHub MCP server + demo workflow (issue → fix → PR)                | Zhiping | `.mcp.json` configured, issue #2 filed + PR #3 opened through MCP tool calls  |
| S9  | Two Claude Code hooks: PostToolUse formatter + Stop test runner            | Both    | Editing a `.ts` file auto-formats; stopping the session runs the test suite   |

## Status (end of sprint)

| ID  | Status  | Evidence                                                                                      |
| --- | ------- | --------------------------------------------------------------------------------------------- |
| S1  | ✅ Done | Commit `8b5b3c9` — Next.js 15 + React 19 + Tailwind; landing page rendered in browser preview |
| S2  | ✅ Done | Commit `b7b469a` — 20 files renamed under `legacy/` preserving history                        |
| S3  | ✅ Done | Commit `1051a4b` — replaced Clerk with Auth.js v5 + bcryptjs + zod                            |
| S4  | ✅ Done | Commit `28d94d0` → updated in `1051a4b` for the username/password swap                        |
| S5  | ✅ Done | Commit `28d94d0` — Monaco with Python + LaTeX toggle, seed docs per language                  |
| S6  | ✅ Done | Commit `1c8f4c1` — 24 legacy SessionStats tests ported + passing, no VS Code imports          |
| S7  | ✅ Done | Commit `8a0e390` — `/api/intent` + IntentPanel + dashboard wiring; browser-verified           |
| S8  | ✅ Done | GitHub MCP integrated in earlier chapter; docs under `docs/mcp-*.md`                          |
| S9  | ✅ Done | Commit `1c8f4c1` — `.claude/settings.json` hooks added                                        |

## Retrospective

### What went well

- **The legacy/ reuse paid off.** `SessionStats` and `mockIntentAnalyzer`
  dropped in with only `vscode.Range → TextRange` renames. The 24
  existing tests caught one typo during the port and otherwise passed
  on first run.
- **Clerk → Auth.js swap didn't blow up the sprint.** Zhiping flagged
  that Clerk's "keyless mode" kept showing a Google button even after
  we'd decided against OAuth. Switching to Auth.js Credentials was a
  ~90 minute detour, not the day-long rewrite we feared.
- **Dev bypass flag** (`PROACTIVEUI_DEV_BYPASS_AUTH=1`) turned out to
  be unlocking. We could demo intent detection end-to-end in the
  browser the same day we wrote the API route, without waiting for
  Vercel Postgres provisioning.

### What didn't go well

- **A worktree mishap wasted ~20 minutes** — work was committed inside
  a stale `nostalgic-knuth` directory that was no longer a registered
  worktree. Recovered by copying files to the real worktree and
  re-committing, but we should establish a "always print `git
worktree list` before a big rename" rule.
- **Prisma 7's breaking change** (datasource URL moved to
  `prisma.config.ts`) cost ~10 minutes before we downgraded to Prisma 6.
  Worth pinning `@prisma/client` and `prisma` to the same major line
  explicitly.

### Action items for Sprint 2

1. Add the `tdd-feature` skill as guidance before writing any new
   feature in `src/lib/`. Already done mid-sprint but not formally
   invoked.
2. Provision Vercel Postgres at the **start** of Sprint 2 so auth and
   agent execution can be tested end-to-end, not mocked out.
3. Document the worktree pitfall in the team CONTRIBUTING guide (will
   live at `docs/contributing.md` next sprint).

## Async standups

See `docs/standups/` (one file per standup per partner). Sprint 1
covered 3 standups per person, logged in `docs/standups/sprint-1/`.
