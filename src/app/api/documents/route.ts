import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(120),
  language: z.enum(["python", "latex", "csv"]),
  content: z.string().max(200_000).optional(),
});

const PRISMA_LANGUAGE = {
  python: "PYTHON",
  latex: "LATEX",
  csv: "CSV",
} as const;
type PrismaLanguage = (typeof PRISMA_LANGUAGE)[keyof typeof PRISMA_LANGUAGE];

/** In dev-bypass mode, reuse the synthetic dev-guest row. */
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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = await resolveUserId(user);
  const documents = await prisma.document.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      language: true,
      updatedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const userId = await resolveUserId(user);
  const { title, language, content } = parsed.data;
  const prismaLang: PrismaLanguage = PRISMA_LANGUAGE[language];
  const document = await prisma.document.create({
    data: {
      title,
      language: prismaLang,
      content: content ?? "",
      userId,
    },
  });

  return NextResponse.json({ document }, { status: 201 });
}
