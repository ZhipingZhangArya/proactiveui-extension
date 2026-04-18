import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const PatchSchema = z.object({
  op: z.enum(["approve", "undo", "dismiss"]),
});

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

  // Writers can only patch their own agents. Reviewers can patch any.
  const agent = await prisma.agent.findFirst({
    where:
      user.role === "REVIEWER"
        ? { id }
        : { id, user: { id: user.id === "dev-guest" ? undefined : user.id } },
  });

  if (!agent) {
    // Fall back: in dev bypass mode, allow the dev-guest row to match.
    const devAgent =
      user.id === "dev-guest"
        ? await prisma.agent.findFirst({
            where: { id, user: { username: "dev-guest" } },
          })
        : null;
    if (!devAgent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const updated = await prisma.agent.update({
    where: { id },
    data: nextStateFor(parsed.data.op),
  });

  return NextResponse.json({ agent: updated });
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
  await prisma.agent.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

function nextStateFor(op: "approve" | "undo" | "dismiss") {
  if (op === "approve") {
    return { status: "APPROVED" as const, artifactState: "APPROVED" as const };
  }
  if (op === "undo") {
    return { status: "REVERTED" as const, artifactState: "REVERTED" as const };
  }
  // dismiss: just mark reverted without touching the artifact
  return { status: "REVERTED" as const };
}
