import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";

const ApproveSchema = z.object({
  draftId: z.string(),
  action: z.enum(["approve", "reject"]),
  humanNote: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { draftId, action, humanNote, scheduledAt } = parsed.data;

  const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "reject") {
    const updated = await prisma.contentDraft.update({
      where: { id: draftId },
      data: { status: "REJECTED", humanNote: humanNote ?? null },
    });
    return NextResponse.json({ draft: updated });
  }

  // Approve
  const updated = await prisma.contentDraft.update({
    where: { id: draftId },
    data: {
      status: scheduledAt ? "SCHEDULED" : "APPROVED",
      humanNote: humanNote ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  });

  // Create publish job if scheduled
  if (scheduledAt) {
    await prisma.schedulerJob.create({
      data: {
        draftId,
        jobType: "PUBLISH",
        status: "PENDING",
        runAt: new Date(scheduledAt),
      },
    });
  }

  return NextResponse.json({ draft: updated });
}
