import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { calculateMarketScore } from "@/lib/market/scoring";

const MarketSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  volume: z.number().min(0).max(1),
  trend: z.number().min(0).max(1),
  cpc: z.number().min(0).max(1),
  competition: z.number().min(0).max(1),
  policyRisk: z.number().min(0).max(1),
  prodCost: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export async function GET() {
  const markets = await prisma.market.findMany({
    orderBy: { score: "desc" },
    include: { _count: { select: { drafts: true } } },
  });
  return NextResponse.json({ markets });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = MarketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const breakdown = calculateMarketScore(data);

  const market = await prisma.market.create({
    data: {
      ...data,
      score: breakdown.total,
    },
  });

  return NextResponse.json({ market, breakdown }, { status: 201 });
}
