# Security — ProactiveUI

Imported from `CLAUDE.md`. This is the OWASP Top 10 applied to this
specific codebase, plus the automated gates that enforce it. Keep it
short, honest, and up-to-date — a stale security doc is worse than
no doc.

## OWASP Top 10, applied

### A01: Broken Access Control

Every `/api/**` route except `/api/auth/**` calls `getCurrentUser()`
from `src/lib/auth/getCurrentUser.ts`. Routes that load records by
URL param must scope the query to the current user, e.g.:

```ts
await prisma.document.findFirst({
  where: { id: params.id, userId: user.id },
});
```

A raw `findUnique({ where: { id } })` with user-supplied `id` and no
ownership check is a blocker during review.

Reviewers (role = `REVIEWER`) can read any document and approve/undo
any agent, but cannot edit document content. Role checks live in
`src/lib/auth/roles.ts` (coming with artifact execution).

### A02: Cryptographic Failures

- Passwords: `bcrypt.hash(password, 10)` in
  `src/app/api/auth/signup/route.ts`; compared with `bcrypt.compare`
  in `src/auth.ts`.
- Sessions: Auth.js JWT signed with `AUTH_SECRET` (32-byte random
  hex). Generate with `openssl rand -hex 32`.
- Secrets never log. `AUTH_SECRET`, `ANTHROPIC_API_KEY`, and
  `DATABASE_URL` come from env vars; `.env.local` is gitignored.

### A03: Injection

Prisma parameterizes every query. We do not use `$queryRaw` /
`$executeRaw` anywhere; if a future change adds one, it must use the
`Prisma.sql` tag template:

```ts
await prisma.$queryRaw(Prisma.sql`SELECT * FROM "User" WHERE id = ${id}`);
```

Zod validation is applied at every API boundary — see
`src/app/api/intent/route.ts` and `src/app/api/auth/signup/route.ts`
for the pattern.

### A04: Insecure Design

The dev bypass (`PROACTIVEUI_DEV_BYPASS_AUTH=1`) only activates when
`NODE_ENV !== "production"`. Production deploys ignore it — the check
in `src/lib/auth/getCurrentUser.ts` gates on both conditions.

### A05: Security Misconfiguration

- `.gitignore` excludes `.mcp.json`, `.env`, `.env.local`, and `.vercel/`.
- Gitleaks scans the full history on every push.
- CORS: Next.js defaults apply (same-origin).
- Cookies: Auth.js defaults — `httpOnly`, `sameSite: "lax"`,
  `secure: true` in production. No overrides.

### A06: Vulnerable / Outdated Components

- `npm audit --audit-level=high` runs in CI (`.github/workflows/ci.yml`).
- Dependabot (recommended when the repo is made public) will auto-PR
  upgrades for security advisories.

### A07: Identification / Authentication Failures

- Usernames: 3–32 chars, `[a-zA-Z0-9_-]+`. Enforced by zod and by the
  signup form `pattern`/`minLength`/`maxLength` attributes.
- Passwords: ≥ 6 characters (bumps to 12 recommended for production).
- No password reset flow — scoped out intentionally. Users who lose
  access must re-register with a different username.
- Rate limiting on sign-in / signup is a known TODO (A04 / A07
  overlap). Vercel's platform throttle provides a baseline.

### A08: Software / Data Integrity Failures

- CI is reproducible: exact `node-version: "22"` + `npm ci`.
- Prisma migrations are committed; prod runs
  `npx prisma migrate deploy` which only applies existing SQL, never
  generates.

### A09: Security Logging & Monitoring Failures

- Next.js + Vercel platform logs capture every request.
- Failed signups return 4xx and are visible in logs without exposing
  which specific field failed.
- `security-reviewer` sub-agent can be invoked before merge to spot
  regressions.

### A10: Server-Side Request Forgery

- The only outbound HTTP call is to `api.anthropic.com` via the SDK.
  URL is hard-coded by the SDK — no user input influences it.

## Definition of Done — security acceptance criteria

A PR is not merge-ready until:

- [ ] No new `/api/**` route is missing a `getCurrentUser()` check
      (or documented public reason).
- [ ] Any new user input passes through a zod schema.
- [ ] `npm audit --audit-level=high` reports 0 findings.
- [ ] Gitleaks scan is clean (CI enforces).
- [ ] No secret is committed. `.mcp.json`-style local files stay
      gitignored.
- [ ] If the change touches auth, role checks, or the DB query layer,
      the `security-reviewer` sub-agent has been run on the diff.

## Known gaps (tracked)

- **No rate limit on `/api/auth/signup` / `/api/auth/signin`** — relies
  on Vercel platform throttle. Add a per-IP limiter once deployed.
- **No CSRF token on API routes** — Auth.js JWT over a same-site cookie
  mitigates most CSRF, but a form-submitting classic attacker could
  still try. The API routes expect JSON, not form data, which helps.
- **No 2FA** — out of scope for the prototype.
- **No account lockout** — out of scope.
