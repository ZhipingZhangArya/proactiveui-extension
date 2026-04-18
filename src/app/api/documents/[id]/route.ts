import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const PatchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().max(200_000).optional(),
});

async function resolveUserId(user: {
  id: string;
  name: string;
}): Promise<string> {
  if (user.id !== "dev-guest") return user.id;
  const existing = await prisma.user.findUnique({
    where: { username: "dev-guest" },
  });
  return existing?.id ?? "";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const userId = await resolveUserId(user);

  const document = await prisma.document.findFirst({
    where: user.role === "REVIEWER" ? { id } : { id, userId },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Reviewers cannot edit document content — only writers (the owner) can.
  if (user.role === "REVIEWER") {
    return NextResponse.json(
      { error: "Reviewers cannot edit document content" },
      { status: 403 },
    );
  }

  const userId = await resolveUserId(user);
  const document = await prisma.document.findFirst({
    where: { id, userId },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ document: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const userId = await resolveUserId(user);
  const document = await prisma.document.findFirst({
    where: { id, userId },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
