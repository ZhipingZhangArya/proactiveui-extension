import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  buildArtifactContent,
  buildSummary,
  buildThinking,
} from "@/lib/core/agentManager";
import type { ActionId } from "@/types/proactive";

const ACTION_IDS = [
  "writeCode",
  "detailStep",
  "exploreAlternative",
  "improveComment",
  "fixGrammar",
  "rewriteAcademic",
  "expandParagraph",
  "summarizeUnderstanding",
] as const;

const CreateAgentSchema = z.object({
  actionId: z.enum(ACTION_IDS),
  actionLabel: z.string().min(1).max(80),
  originText: z.string().min(1).max(5000),
  insertionLine: z.number().int().min(0),
  fileType: z.enum(["python", "latex"]),
  documentId: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { actionId, actionLabel, originText, insertionLine, fileType } =
    parsed.data;

  const thinking = buildThinking(actionId as ActionId, originText);
  const summary = buildSummary(actionId as ActionId, originText);

  const agent = await prisma.agent.create({
    data: {
      actionId,
      actionLabel,
      originText,
      insertionLine,
      status: "AWAITING_APPROVAL",
      thinking,
      summary,
      userId: user.id === "dev-guest" ? await ensureDevUser() : user.id,
    },
  });

  const artifact = buildArtifactContent(
    actionId as ActionId,
    originText,
    agent.id,
    fileType,
  );

  const updated = artifact
    ? await prisma.agent.update({
        where: { id: agent.id },
        data: {
          artifact: artifact.full,
          artifactState: "PENDING",
          artifactStartLine: insertionLine + 1,
          artifactEndLine: insertionLine + artifact.full.split("\n").length,
        },
      })
    : agent;

  return NextResponse.json({ agent: updated, artifact }, { status: 201 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id === "dev-guest" ? await ensureDevUser() : user.id;

  const agents = await prisma.agent.findMany({
    where: user.role === "REVIEWER" ? {} : { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ agents });
}

/**
 * Dev-mode only: when the PROACTIVEUI_DEV_BYPASS_AUTH flag is set, we
 * don't have a real Clerk / Auth.js session, but Prisma still requires
 * a valid userId. Lazily upsert a synthetic "dev-guest" user row.
 */
async function ensureDevUser(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { username: "dev-guest" },
  });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      username: "dev-guest",
      // Random password; this row is only used for FK integrity in dev.
      password: "!disabled",
    },
  });
  return created.id;
}
