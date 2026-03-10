import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { generateDrafts } from "@/lib/content/generator";
import { runAutoQC, needsHumanReview } from "@/lib/content/qc";

const GenerateSchema = z.object({
  marketId: z.string().optional(),
  platform: z.enum(["TIKTOK", "YOUTUBE", "X", "INSTAGRAM"]).default("TIKTOK"),
  theme: z.string().min(1),
  persona: z.string().min(1),
  pain: z.string().min(1),
  monetization: z.string().min(1),
  prRequired: z.boolean().default(false),
  provider: z.enum(["claude", "openai"]).optional(),
  count: z.number().int().min(1).max(10).default(3),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const request = parsed.data;

  // Generate drafts via LLM
  const generated = await generateDrafts(request, {
    provider: request.provider,
  });

  // Save and immediately QC each draft
  const results = await Promise.all(
    generated.map(async (draft) => {
      // Save draft
      const saved = await prisma.contentDraft.create({
        data: {
          marketId: request.marketId ?? null,
          platform: request.platform,
          status: "DRAFT",
          riskLevel: draft.riskLevel,
          title: draft.title,
          content: draft.content,
          hook: draft.hook,
          cta: draft.cta,
          hashtags: JSON.stringify(draft.hashtags),
          prRequired: request.prRequired,
        },
      });

      // Run auto QC immediately
      const qc = await runAutoQC({
        title: draft.title,
        content: draft.content,
        hook: draft.hook,
        cta: draft.cta,
        hashtags: draft.hashtags.join(", "),
        platform: request.platform,
        prRequired: request.prRequired,
      });

      const needsHuman = needsHumanReview(qc);
      const updated = await prisma.contentDraft.update({
        where: { id: saved.id },
        data: {
          status: needsHuman ? "NEEDS_HUMAN" : "QC_PASSED",
          riskLevel: qc.riskLevel,
          qcResult: JSON.stringify(qc),
          prRequired: qc.prRequired,
        },
      });

      return { draft: updated, qc, needsHuman };
    })
  );

  return NextResponse.json({ results }, { status: 201 });
}
