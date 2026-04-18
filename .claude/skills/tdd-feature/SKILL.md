---
name: tdd-feature
description: Use this skill when the user asks to implement a new feature, fix a bug, or add a method to a pure-logic module. Enforces a strict red → green → refactor cycle with a commit at each phase so the git history tells the TDD story. Examples the skill should match: "add a method to SessionStats", "implement approvalRate", "write tests for the intent analyzer", "fix the bug where X", "use TDD to add Y".
version: 2
---

# TDD Feature Skill — v2

_v2 changes over v1_: (a) clarified the "one commit per phase" rule
after a pre-commit hook that runs tests nearly blocked a legitimate
red commit; (b) added guidance on picking a meaningful failing test
vs. a trivially-passing one; (c) added a worked example using commits
that already exist in this repo.

This repo uses **strict test-first development** for any new logic in
`src/lib/core/` or `src/lib/llm/`. A feature is not "done" until every
phase below has its own commit.

## Scope

- Applies to pure-logic modules in `src/lib/` and shared types in
  `src/types/`.
- Does NOT apply to React components, Next.js pages, or API route
  handlers — those have looser patterns.
- Anthropic SDK calls must be mocked with `vi.mock`; never hit the
  real API in tests.

## Phases

### 1. Red — write a failing test first

1. Open or create the test file alongside the module
   (`__tests__/<name>.test.ts`).
2. Describe the smallest behaviour that's missing. One `it()` per
   behaviour — resist the urge to group.
3. **Write a test that would actually fail.** A test that passes
   accidentally (e.g., asserting on a truthy value that happens to
   be truthy) teaches nothing. The test must fail for the right
   reason: the behaviour under test does not exist yet.
4. Run `npm test` and confirm the test fails with a meaningful
   assertion error, not a compile or import error.
5. Commit exactly the new test with message:
   `test(red): <what the test covers>`.

> **On the Stop hook:** this repo has a Stop hook in
> `.claude/settings.json` that runs `npm test` at end of turn. That's
> post-hoc — it does not block commits. But if you notice the hook
> reporting failures at end of turn, check your history: if the
> failing tests are your fresh red tests, that's expected.

### 2. Green — make it pass with the minimum change

1. Write the least code needed to turn the new test green.
2. Do not change other tests. Do not refactor unrelated code.
3. Run `npm test` and confirm the red test now passes AND every
   previously-green test still passes.
4. Commit the implementation with message:
   `feat(green): <what the code does>`.

### 3. Refactor — clean up only once green

1. Improve names, extract helpers, remove duplication — behaviour
   must not change.
2. Run `npm test` after each edit; if a test goes red, undo and
   retry smaller.
3. Commit with message: `refactor: <what improved>`.
4. **Skip this commit explicitly** if nothing needed cleaning. In
   the PR description, note "Refactor phase: nothing needed" so the
   reviewer knows you considered it.

## Worked example (from this repo's git history)

Feature: "recognize `visualize`, `predict`, `train`, `transform` as
Python step words in the mock intent analyzer."

| Commit    | Phase    | Message                                                           |
| --------- | -------- | ----------------------------------------------------------------- |
| `0289bb8` | red      | `test(red): Python step triggers for visualize/predict/train/...` |
| `5d1d7d4` | green    | `feat(green): recognize visualize/predict/train/transform as...`  |
| `6f6be87` | refactor | `refactor: extract PYTHON_STEP_KEYWORDS constant`                 |

Run `git show <sha> --stat` on any of these to confirm: the red
commit touches only the test file; the green commit touches only
the implementation; the refactor commit adjusts the implementation
only and leaves tests untouched.

## Picking a meaningful red test

Good red tests probe **observable behaviour** — what a user, caller,
or API client would see. Bad ones probe internal state nobody can
observe.

- Good: "analyzing `# visualize the data` returns `semanticType:
"step"`"
- Bad: "calling `setLastClassification` updates a private field"

When in doubt, ask: if this test disappears, would a real bug ship?
If no, the test is not worth writing.

## Constraints

- Never combine red + green into one commit. The grader (and your
  future self) should be able to run `git checkout <red-commit>` and
  see the failing test.
- No `.only` / `.skip` committed. Remove before staging.
- Vitest only — do not add Jest or swap the runner.
- Every module in `src/lib/core/` must have a matching
  `__tests__/<name>.test.ts`.

## When asked to add a feature

Walk through all three phases in one pass. Announce the phase before
running tests ("Red: writing failing test"; "Green: implementing";
"Refactor: extracting helper"). Do not skip the refactor question —
say explicitly "nothing to refactor" if that's the case.

## When the user asks you to "add tests for existing code"

That is not TDD — that is test coverage work. Don't use this skill;
write the tests as a single commit, label them appropriately, and
move on. TDD is only for new behaviour.
