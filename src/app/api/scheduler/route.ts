import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { runPendingJobs } from "@/lib/scheduler/runner";

const ScheduleJobSchema = z.object({
  jobType: z.enum(["GENERATE", "QC_CHECK", "PUBLISH", "ANALYTICS_FETCH"]),
  draftId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  runAt: z.string().datetime().optional(),
});

export async function GET() {
  const jobs = await prisma.schedulerJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      draft: { select: { id: true, title: true, status: true, platform: true } },
    },
  });
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Run pending jobs
  if (searchParams.get("action") === "run") {
    const results = await runPendingJobs();
    return NextResponse.json({ results });
  }

  // Schedule a new job
  const body = await req.json();
  const parsed = ScheduleJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const job = await prisma.schedulerJob.create({
    data: {
      jobType: parsed.data.jobType,
      draftId: parsed.data.draftId ?? null,
      payload: parsed.data.payload ? JSON.stringify(parsed.data.payload) : null,
      runAt: parsed.data.runAt ? new Date(parsed.data.runAt) : new Date(),
      status: "PENDING",
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
