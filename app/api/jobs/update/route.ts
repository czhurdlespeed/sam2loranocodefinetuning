import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";
import { trainingJob } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

// This endpoint is called by a webhook or background job to update job status
// It should be protected with a secret token
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.JOB_UPDATE_SECRET;

    if (!expectedSecret) {
      console.error("JOB_UPDATE_SECRET environment variable is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, jobId, status, r2Key } = body;

    if (!userId || !jobId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ["pending", "running", "completed", "failed", "cancelled"];
    if (typeof status !== "string" || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate types
    if (typeof userId !== "string" || userId.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    if (typeof jobId !== "string" && typeof jobId !== "number") {
      return NextResponse.json(
        { error: "Invalid jobId type" },
        { status: 400 }
      );
    }

    // Validate userId format to prevent injection
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      );
    }

    // Find and update the job
    const job = await db.query.trainingJob.findFirst({
      where: (jobs, { eq, and }) =>
        and(eq(jobs.userId, userId), eq(jobs.jobId, String(jobId))),
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Update job status and optionally r2Key
    // Validate r2Key if provided
    if (r2Key && (typeof r2Key !== "string" || r2Key.trim().length === 0)) {
      return NextResponse.json(
        { error: "Invalid r2Key" },
        { status: 400 }
      );
    }

    // Type assertion is safe here because we validated status above
    const updateData: {
      status: "pending" | "running" | "completed" | "failed" | "cancelled";
      r2Key?: string;
    } = { status: status as "pending" | "running" | "completed" | "failed" | "cancelled" };
    if (r2Key) {
      updateData.r2Key = r2Key;
    }

    await db
      .update(trainingJob)
      .set(updateData)
      .where(eq(trainingJob.id, job.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in job update endpoint:", error);
    // Don't leak internal error details to client
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
