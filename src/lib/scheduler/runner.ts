/**
 * Scheduler / Job Runner
 *
 * Processes pending SchedulerJobs from the DB.
 * Called by POST /api/scheduler/run (triggered by cron / external scheduler).
 *
 * Job types:
 *   GENERATE      → generate content drafts for a market
 *   QC_CHECK      → run auto-QC on a draft
 *   PUBLISH       → publish an approved draft to TikTok
 *   ANALYTICS_FETCH → (stub) fetch analytics from platform
 */

import { prisma, type Prisma } from "@/lib/db/client";
import { generateDrafts } from "@/lib/content/generator";
import { runAutoQC, needsHumanReview } from "@/lib/content/qc";
import { createTikTokClient } from "@/lib/platforms/tiktok";
import type { GenerateRequest } from "@/types";

type JobWithDraft = Prisma.SchedulerJobGetPayload<{
  include: { draft: true };
}>;

type DraftForRunner = JobWithDraft["draft"];

export interface JobRunResult {
  jobId: string;
  type: string;
  status: "COMPLETED" | "FAILED";
  result?: unknown;
  error?: string;
}

/** Run all pending jobs that are due now. Returns results for each job. */
export async function runPendingJobs(): Promise<JobRunResult[]> {
  const jobs = await prisma.schedulerJob.findMany({
    where: {
      status: "PENDING",
      runAt: { lte: new Date() },
    },
    include: { draft: true },
    orderBy: { runAt: "asc" },
    take: 20, // safety cap per run
  });

  const results: JobRunResult[] = [];

  for (const job of jobs) {
    // Mark as running
    await prisma.schedulerJob.update({
      where: { id: job.id },
      data: { status: "RUNNING" },
    });

    let result: JobRunResult;
    try {
      result = await dispatchJob(job);
    } catch (err) {
      result = {
        jobId: job.id,
        type: job.jobType,
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Update job record
    await prisma.schedulerJob.update({
      where: { id: job.id },
      data: {
        status: result.status === "COMPLETED" ? "COMPLETED" : "FAILED",
        result: result.result ? JSON.stringify(result.result) : null,
        error: result.error ?? null,
        completedAt: new Date(),
      },
    });

    results.push(result);
  }

  return results;
}

async function dispatchJob(job: JobWithDraft): Promise<JobRunResult> {
  const payload = job.payload ? JSON.parse(job.payload) : {};

  switch (job.jobType) {
    case "GENERATE":
      return runGenerateJob(job.id, payload);
    case "QC_CHECK":
      return runQCJob(job.id, job.draft, payload);
    case "PUBLISH":
      return runPublishJob(job.id, job.draft);
    case "ANALYTICS_FETCH":
      return runAnalyticsFetchJob(job.id, payload);
    default:
      throw new Error(`Unknown job type: ${job.jobType}`);
  }
}

async function runGenerateJob(
  jobId: string,
  payload: Partial<GenerateRequest>
): Promise<JobRunResult> {
  const request: GenerateRequest = {
    platform: payload.platform ?? "TIKTOK",
    theme: payload.theme ?? "未設定",
    persona: payload.persona ?? "一般ユーザー",
    pain: payload.pain ?? "悩み未設定",
    monetization: payload.monetization ?? "アフィリエイト",
    prRequired: payload.prRequired ?? false,
    marketId: payload.marketId,
    count: payload.count ?? 3,
  };

  const drafts = await generateDrafts(request);

  // Save drafts to DB
  const savedDrafts = await Promise.all(
    drafts.map((d) =>
      prisma.contentDraft.create({
        data: {
          marketId: request.marketId ?? null,
          platform: request.platform,
          status: "DRAFT",
          riskLevel: d.riskLevel,
          title: d.title,
          content: d.content,
          hook: d.hook,
          cta: d.cta,
          hashtags: JSON.stringify(d.hashtags),
          prRequired: request.prRequired,
        },
      })
    )
  );

  // Queue QC jobs for each draft
  await Promise.all(
    savedDrafts.map((draft) =>
      prisma.schedulerJob.create({
        data: {
          draftId: draft.id,
          jobType: "QC_CHECK",
          status: "PENDING",
          runAt: new Date(),
        },
      })
    )
  );

  return {
    jobId,
    type: "GENERATE",
    status: "COMPLETED",
    result: { draftsCreated: savedDrafts.length },
  };
}

async function runQCJob(
  jobId: string,
  draft: DraftForRunner,
  _payload: unknown
): Promise<JobRunResult> {
  if (!draft) throw new Error("QC_CHECK job has no associated draft");

  const qc = await runAutoQC({
    title: draft.title ?? undefined,
    content: draft.content,
    hook: draft.hook ?? undefined,
    cta: draft.cta ?? undefined,
    hashtags: draft.hashtags ?? undefined,
    platform: draft.platform,
    prRequired: draft.prRequired,
  });

  const needsHuman = needsHumanReview(qc);

  await prisma.contentDraft.update({
    where: { id: draft.id },
    data: {
      status: needsHuman ? "NEEDS_HUMAN" : "QC_PASSED",
      riskLevel: qc.riskLevel,
      qcResult: JSON.stringify(qc),
      prRequired: qc.prRequired,
    },
  });

  return {
    jobId,
    type: "QC_CHECK",
    status: "COMPLETED",
    result: { pass: qc.pass, riskLevel: qc.riskLevel, needsHuman },
  };
}

async function runPublishJob(
  jobId: string,
  draft: DraftForRunner
): Promise<JobRunResult> {
  if (!draft) throw new Error("PUBLISH job has no associated draft");
  if (draft.status !== "APPROVED") {
    throw new Error(`Draft ${draft.id} is not APPROVED (status: ${draft.status})`);
  }

  const tiktok = createTikTokClient();
  const hashtags: string[] = draft.hashtags ? JSON.parse(draft.hashtags) : [];

  // NOTE: Real video URL must be stored in the draft or payload.
  // Here we read it from env as fallback for testing.
  const videoUrl = process.env.TIKTOK_TEST_VIDEO_URL;
  if (!videoUrl) {
    throw new Error(
      "No video URL available. Set TIKTOK_TEST_VIDEO_URL or attach video to draft."
    );
  }

  const publishResult = await tiktok.publishByUrl({
    videoUrl,
    title: draft.title ?? draft.content.slice(0, 100),
    hashtags,
    privacyLevel: "SELF_ONLY", // safe default; change to PUBLIC for production
  });

  await prisma.contentDraft.update({
    where: { id: draft.id },
    data: {
      status: publishResult.success ? "PUBLISHED" : "FAILED",
      publishedAt: publishResult.success ? new Date() : null,
      tiktokPostId: publishResult.postId ?? null,
    },
  });

  return {
    jobId,
    type: "PUBLISH",
    status: publishResult.success ? "COMPLETED" : "FAILED",
    result: publishResult,
    error: publishResult.error,
  };
}

async function runAnalyticsFetchJob(
  jobId: string,
  _payload: unknown
): Promise<JobRunResult> {
  // Stub: TikTok Analytics API integration to be added
  return {
    jobId,
    type: "ANALYTICS_FETCH",
    status: "COMPLETED",
    result: { message: "Analytics fetch not yet implemented" },
  };
}
