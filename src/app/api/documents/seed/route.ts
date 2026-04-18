import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { SEED_DOCUMENTS } from "@/lib/core/seedDocuments";

const PRISMA_LANGUAGE = {
  python: "PYTHON",
  latex: "LATEX",
  csv: "CSV",
} as const;

async function resolveUserId(user: {
  id: string;
  name: string;
}): Promise<string> {
  if (user.id !== "dev-guest") return user.id;
  const existing = await prisma.user.findUnique({
    where: { username: "dev-guest" },
  });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: { username: "dev-guest", password: "!disabled" },
  });
  return created.id;
}

/**
 * Idempotent: only creates seed docs when the user currently has zero
 * documents, so repeated calls after the user deletes everything won't
 * resurrect them. If anything is present we return early.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await resolveUserId(user);

  const existingCount = await prisma.document.count({ where: { userId } });
  if (existingCount > 0) {
    return NextResponse.json({ seeded: false, reason: "already-has-files" });
  }

  const created = await prisma.$transaction(
    SEED_DOCUMENTS.map((d) =>
      prisma.document.create({
        data: {
          title: d.title,
          content: d.content,
          language: PRISMA_LANGUAGE[d.language],
          userId,
        },
        select: {
          id: true,
          title: true,
          language: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
    ),
  );

  return NextResponse.json(
    { seeded: true, documents: created },
    { status: 201 },
  );
}
