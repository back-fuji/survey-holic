import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { createTikTokClient } from "@/lib/platforms/tiktok";

const PublishSchema = z.object({
  draftId: z.string(),
  videoUrl: z.string().url(),
  privacyLevel: z
    .enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"])
    .default("SELF_ONLY"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = PublishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { draftId, videoUrl, privacyLevel } = parsed.data;

  const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  if (draft.status !== "APPROVED") {
    return NextResponse.json(
      { error: `Draft status is "${draft.status}". Must be APPROVED to publish.` },
      { status: 400 }
    );
  }

  const hashtags: string[] = draft.hashtags ? JSON.parse(draft.hashtags) : [];

  const tiktok = createTikTokClient();
  const result = await tiktok.publishByUrl({
    videoUrl,
    title: draft.title ?? draft.content.slice(0, 100),
    hashtags,
    privacyLevel,
  });

  await prisma.contentDraft.update({
    where: { id: draftId },
    data: {
      status: result.success ? "PUBLISHED" : "FAILED",
      publishedAt: result.success ? new Date() : null,
      tiktokPostId: result.postId ?? null,
    },
  });

  return NextResponse.json({ result });
}
