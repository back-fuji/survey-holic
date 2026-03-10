import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { calculateMarketScore } from "@/lib/market/scoring";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  volume: z.number().min(0).max(1).optional(),
  trend: z.number().min(0).max(1).optional(),
  cpc: z.number().min(0).max(1).optional(),
  competition: z.number().min(0).max(1).optional(),
  policyRisk: z.number().min(0).max(1).optional(),
  prodCost: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const market = await prisma.market.findUnique({
    where: { id },
    include: { drafts: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!market) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ market });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.market.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const merged = { ...existing, ...parsed.data };
  const breakdown = calculateMarketScore(merged);

  const market = await prisma.market.update({
    where: { id },
    data: { ...parsed.data, score: breakdown.total },
  });

  return NextResponse.json({ market, breakdown });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.market.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
