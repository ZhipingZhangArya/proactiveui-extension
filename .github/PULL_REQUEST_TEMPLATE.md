## Summary

<!-- 1-3 sentences on what this PR does and why. Link the issue it
closes with "Closes #N". -->

## C.L.E.A.R. self-review

- **C**orrectness: <!-- Have you run `npm test` + `npm run test:e2e`? -->
- **L**egibility: <!-- Any sections you'd point a reviewer to first? -->
- **E**fficiency: <!-- Any perf considerations? N+1s? big payloads? -->
- **A**rchitecture: <!-- Does it fit CLAUDE.md + docs/architecture.md? -->
- **R**obustness: <!-- Auth on new API routes? zod at boundaries? edge cases? -->

## Test plan

- [ ] `npm run lint` — passes
- [ ] `npm run type-check` — passes
- [ ] `npm test` — passes, new behaviour has unit tests
- [ ] `npm run test:e2e` — passes (if UI/API changed)
- [ ] Manually walked the happy path in the browser
- [ ] Security checklist in `docs/security.md` reviewed for any new API routes

## AI disclosure

<!-- Required per the team process. Tick one. -->

- [ ] ~0%: I wrote this by hand; AI was used only for style/format feedback.
- [ ] ~25%: AI helped draft one or two methods; I wrote tests + refactors myself.
- [ ] ~50%: AI-assisted implementation, human review + test design.
- [ ] ~75%: AI wrote most of the diff; human verified + exercised edge cases.
- [ ] ~100%: AI-authored with light human review (note why this was okay).

Tool used: <!-- e.g. Claude Code + Claude Opus 4.6, Cursor, GitHub Copilot -->

Human review applied: <!-- yes/no + what you checked for (correctness,
security, integration, etc.) -->
