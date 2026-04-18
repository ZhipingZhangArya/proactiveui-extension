---
name: tdd-feature
description: Use this skill when the user asks to implement a new feature, fix a bug, or add a method to a pure-logic module. Enforces a strict red → green → refactor cycle with a commit at each phase so the git history tells the TDD story. Examples the skill should match: "add a method to SessionStats", "implement approvalRate", "write tests for the intent analyzer", "fix the bug where X", "use TDD to add Y".
version: 1
---

# TDD Feature Skill

This repo uses **strict test-first development** for any new logic in `src/lib/core/` or `src/lib/llm/`. A feature is not "done" until every step below has its own commit.

## Scope

- Applies to pure-logic modules in `src/lib/` and shared types in `src/types/`.
- Does NOT apply to React components, Next.js pages, or API route handlers — those have looser patterns.
- Anthropic SDK calls should be mocked with `vi.mock`; never hit the real API in tests.

## Phases

### 1. Red — write a failing test first

1. Open or create the test file alongside the module (`__tests__/<name>.test.ts`).
2. Describe the smallest behaviour that's missing. One `it()` per behaviour — resist the urge to group.
3. Run `npm test` and confirm the test **fails with a meaningful error**, not a compile error.
4. Commit exactly the new test with message: `test(red): <what the test covers>`.

### 2. Green — make it pass with the minimum change

1. Write the least code needed to turn the new test green.
2. Do not change other tests. Do not refactor unrelated code.
3. Run `npm test` and confirm the red test now passes AND every previously-green test still passes.
4. Commit the implementation with message: `feat(green): <what the code does>`.

### 3. Refactor — clean up only once green

1. Improve names, extract helpers, remove duplication — behaviour must not change.
2. Run `npm test` after each edit; if a test goes red, undo and retry smaller.
3. Commit with message: `refactor: <what improved>`. Skip this commit if nothing needed cleaning.

## Constraints

- Never combine red + green into one commit. The grader (and your future self) should be able to run `git checkout <red-commit>` and see the failing test.
- No `.only` / `.skip` committed. Remove before staging.
- Vitest only — do not add Jest or swap the runner.
- Every module in `src/lib/core/` must have a matching `__tests__/<name>.test.ts`.

## When asked to add a feature

Walk through all three phases in one pass. Announce the phase before running tests ("Red: writing failing test"; "Green: implementing"; "Refactor: extracting helper"). Do not skip the refactor question — say explicitly "nothing to refactor" if that's the case.
