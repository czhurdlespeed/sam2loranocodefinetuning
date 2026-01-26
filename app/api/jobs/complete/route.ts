import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";
import { trainingJob } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as logfire from "logfire";
// This endpoint creates a job in the database when training completes successfully
// Failed jobs are never added to the database
export async function POST(req: NextRequest) {
  return logfire.span("Jobs Complete", {}, {}, async () => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session?.user) {
        logfire.error("Unauthorized");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const { jobId, status, r2Key } = body;

      if (!jobId) {
        logfire.error("Missing required field: jobId");
        return NextResponse.json(
          { error: "Missing required field: jobId" },
          { status: 400 }
        );
      }

      // Validate status value
      const validStatuses = ["completed", "failed"];
      if (status && (typeof status !== "string" || !validStatuses.includes(status))) {
        logfire.error(`Invalid status value: ${status}. Must be 'completed' or 'failed'`);
        return NextResponse.json(
          { error: "Invalid status value. Must be 'completed' or 'failed'" },
          { status: 400 }
        );
      }

      // Validate types
      if (typeof jobId !== "string" && typeof jobId !== "number") {
        logfire.error(`Invalid jobId type: ${jobId}`);
        return NextResponse.json(
          { error: "Invalid jobId type" },
          { status: 400 }
        );
      }

      // If status is "failed", do nothing - failed jobs are never added to the database
      if (status === "failed") {
        logfire.error(`Job failed so not storing it in the database of jobs for ${session.user.name} with jobId: ${jobId}`);
        return NextResponse.json({ success: true, message: "Failed job not stored" });
      }

      // If status is "completed", create the job in the database
      if (status === "completed") {
        logfire.info(`Job completed so storing it in the database of jobs for ${session.user.name} with jobId: ${jobId}`);
        // Check if job already exists (shouldn't happen, but be safe)
        const existingJob = await db.query.trainingJob.findFirst({
          where: (jobs, { eq, and }) =>
            and(eq(jobs.userId, session.user.id), eq(jobs.jobId, String(jobId))),
        });

        if (existingJob) {
          logfire.info(`Job already exists so updating it in the database of jobs for ${session.user.name} with jobId: ${jobId}`);
          const updateData: {
            status: "completed";
            r2Key?: string;
          } = { status: "completed" };

          if (r2Key && typeof r2Key === "string" && r2Key.trim().length > 0) {
            updateData.r2Key = r2Key;
          }

          await db
            .update(trainingJob)
            .set(updateData)
            .where(eq(trainingJob.id, existingJob.id));

          return NextResponse.json({ success: true, message: "Job updated as completed" });
        }

        // Create new job record for successful completion
        const dbJobId = randomUUID();
        const r2KeyValue = r2Key && typeof r2Key === "string" && r2Key.trim().length > 0
          ? r2Key
          : `${session.user.id}/${jobId}/checkpoint.zip`;

        logfire.info(`Creating new job record for successful completion for ${session.user.name} with jobId: ${jobId}`);
        await db.insert(trainingJob).values({
          id: dbJobId,
          userId: session.user.id,
          jobId: String(jobId),
          r2Key: r2KeyValue,
          status: "completed",
        });

        logfire.info(`Job created as completed for ${session.user.name} with jobId: ${jobId}`);
        return NextResponse.json({ success: true, message: "Job created as completed" });
      }

      return NextResponse.json(
        { error: "Status must be 'completed' or 'failed'" },
        { status: 400 }
      );
    } catch (error: any) {
      logfire.error(`Error in job complete endpoint: ${error}`);
      console.error("Error in job complete endpoint:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
