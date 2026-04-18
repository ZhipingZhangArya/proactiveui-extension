---
name: prisma-migration
description: Use this skill when the user wants to change the database schema — adding or removing models or fields, changing column types, renaming, or adding indexes. Examples: "add a comments table", "make username case-insensitive", "add a deletedAt field for soft delete", "rename Agent.status to state", "I need an index on userId".
version: 1
---

# Prisma Migration Skill

This repo uses Prisma 6 with a Postgres database on Vercel Postgres. Migrations are source-controlled in `prisma/migrations/` and must be named and committed alongside the schema change.

## Before you change anything

1. Read the current `prisma/schema.prisma`.
2. Decide if the change is **additive** (new field / new table / new index) or **breaking** (removing a column, changing a type, tightening a constraint). Breaking changes need a data backfill plan — stop and write it down first.
3. Check whether any `src/lib/`, `src/app/api/`, or React code reads the field you're about to change. Grep: `rg "fieldName" src/`.

## Workflow

### 1. Edit the schema

Modify `prisma/schema.prisma`. Keep formatting consistent with the rest of the file. Add `@default(...)` for new required fields so existing rows don't break.

### 2. Create a named migration

```bash
DATABASE_URL="..." npx prisma migrate dev --name <kebab-cased-description>
```

Migration names must describe the intent, not the table. Good: `add-document-archived-flag`. Bad: `update-document`.

The `migrate dev` command:

- generates SQL in `prisma/migrations/<timestamp>_<name>/migration.sql`
- applies it to the local dev DB
- regenerates the Prisma client

### 3. Sanity-check the generated SQL

Open the new `migration.sql` and read it. Confirm:

- No unexpected `DROP` statements.
- Defaults backfill existing rows for new NOT NULL columns.
- Renames use `ALTER TABLE ... RENAME COLUMN` (Prisma sometimes drops + recreates — catch that).

### 4. Update code that reads the schema

Find every reference to the old shape and update it:

- `rg "prisma\.<model>\." src/`
- Fix TypeScript errors — Prisma client regenerated so types changed.
- If a field is renamed, update `src/types/proactive.ts` if applicable.

### 5. Test

Run the full test suite: `npm test`. Then start the dev server and walk through the affected user flow in the browser preview.

### 6. Commit

One commit for the schema change and generated migration folder together:

```
feat(db): <what changed in plain English>

Migration: <timestamp>_<name>
```

Never commit the schema change without the generated migration — staging/production deploys rely on `npx prisma migrate deploy` finding them.

## Rollback

If `migrate dev` went wrong locally:

```bash
DATABASE_URL="..." npx prisma migrate reset
```

This wipes the dev DB and re-applies every migration from scratch. Only for local dev — never run against a deployed DB.

## CI / Production

CI runs `npx prisma migrate deploy` against the production DB on merge to main. It only applies migrations; it does not generate new ones. So the generated SQL in `prisma/migrations/` is what production will execute — treat it as code.
