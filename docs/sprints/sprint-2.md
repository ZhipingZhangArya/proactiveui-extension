# Sprint 2 — Polish, quality gates, deploy

**Dates:** 2026-04-17 → planned 2026-04-30
**Team:** Zhiping Zhang, Qiushi Liang

## Sprint goal

Reach production-ready state: TDD coverage on core modules, a real
E2E test in CI, a hardened CI/CD pipeline, Skills v2 iteration, and
the app deployed on Vercel against a live Postgres database. Get the
approve/undo artifact flow working end-to-end (even if the generated
content stays mock).

## Planned stories

| ID  | Story                                                               | Owner   | Acceptance criteria                                                                                 |
| --- | ------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| S10 | TDD features #2 and #3 in `mockIntentAnalyzer`                      | Zhiping | `git log` shows distinct `test(red)` → `feat(green)` → `refactor` triples for two new features      |
| S11 | Playwright E2E covering landing + intent detection                  | Zhiping | `npm run test:e2e` passes with Chromium locally and in CI                                           |
| S12 | GitHub Actions CI with lint, type-check, unit, E2E, security, build | Zhiping | Every push to `project3` runs the full pipeline; failure in any job blocks merge                    |
| S13 | Skills v2 iteration of `tdd-feature`                                | Zhiping | `.claude/skills/tdd-feature/SKILL.md` frontmatter shows `version: 2`; v1 history survives in git    |
| S14 | CLAUDE.md @imports + OWASP section                                  | Zhiping | CLAUDE.md imports `docs/architecture.md` and `docs/security.md`; security section maps all 10 OWASP |
| S15 | AI PR review workflow using claude-code-action                      | Zhiping | `.github/workflows/claude-review.yml` runs on every PR and leaves a C.L.E.A.R.-structured comment   |
| S16 | Agent execution via in-memory store (no DB blocker)                 | Zhiping | Clicking a suggested action spawns an Agent card; Approve / Undo controls update its state          |
| S17 | Provision Vercel Postgres, apply Prisma migrations, deploy          | Zhiping | `vercel --prod` publishes a URL; signup + signin work against the live DB                           |
| S18 | Sprint docs + async standup logs                                    | Both    | `docs/sprints/sprint-1.md` + `sprint-2.md` + ≥3 standup entries per person per sprint               |
| S19 | Writer / Reviewer PR pattern on ≥2 PRs                              | Both    | Two merged PRs with one author, one reviewer using C.L.E.A.R.; AI disclosure filled in both         |

## Status (mid-sprint, 2026-04-17)

| ID  | Status         | Evidence                                                                                               |
| --- | -------------- | ------------------------------------------------------------------------------------------------------ |
| S10 | ✅ Done        | Commits `0289bb8` → `6f6be87`, `66b5971` → `29382ab` — two TDD triples for Python + LaTeX triggers     |
| S11 | ✅ Done        | Commit `602b5e6` — 3 Playwright tests green locally; `.github/workflows/ci.yml` e2e job configured     |
| S12 | ✅ Done        | Commit `602b5e6` — 6 parallel jobs in `.github/workflows/ci.yml`; first live run on next push          |
| S13 | ✅ Done        | `.claude/skills/tdd-feature/SKILL.md` now version 2; v1 still reachable via `git log -p`               |
| S14 | ✅ Done        | CLAUDE.md rewritten with `@imports`; `docs/architecture.md` + `docs/security.md` created               |
| S15 | ✅ Done        | `.github/workflows/claude-review.yml` — runs `anthropics/claude-code-action@v1` with C.L.E.A.R. prompt |
| S16 | 🟡 In progress | Action click is still a stub; in-memory `AgentManager` design ready but not committed                  |
| S17 | 🔴 Blocked     | Waiting on user to create Vercel project + Postgres DB; env var injection also pending                 |
| S18 | 🟡 In progress | Sprint docs + standup scaffolding written this session; filling remaining entries daily                |
| S19 | 🟡 In progress | Writer/Reviewer pattern documented in `.github/PULL_REQUEST_TEMPLATE.md`; executed on PR when opened   |

## Retrospective (to be filled at sprint close)

### What went well

- _TBD_

### What didn't go well

- _TBD_

### Action items for next sprint

- _TBD_
