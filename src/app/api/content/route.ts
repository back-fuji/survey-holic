import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const platform = searchParams.get("platform") ?? undefined;
  const marketId = searchParams.get("marketId") ?? undefined;

  const drafts = await prisma.contentDraft.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
      ...(marketId ? { marketId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { market: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ drafts });
}
