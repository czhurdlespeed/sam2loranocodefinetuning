import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as logfire from "logfire";
/**
 * Downloads checkpoint by proxying through Next.js.
 * Downloads from R2 using the stored r2Key and streams to the client.
 */

export async function GET(req: NextRequest) {
  return logfire.span("Download", {}, {}, async () => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session?.user) {
        logfire.error("Unauthorized")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(req.url);
      const jobId = searchParams.get("jobId");

      if (!jobId) {
        logfire.error("Missing jobId")
        return NextResponse.json(
          { error: "Missing jobId" },
          { status: 400 }
        );
      }

      // Validate jobId is a valid string (prevent injection)
      if (typeof jobId !== "string" || jobId.trim().length === 0) {
        logfire.error("Invalid jobId")
        return NextResponse.json(
          { error: "Invalid jobId" },
          { status: 400 }
        );
      }
      logfire.info(`Downloading checkpoint for ${session.user.name} with jobId: ${jobId}`);

      logfire.info(`Verifying job belongs to ${session.user.name} with jobId: ${jobId}`);
      const job = await db.query.trainingJob.findFirst({
        where: (jobs, { eq, and }) =>
          and(
            eq(jobs.userId, session.user.id),
            eq(jobs.jobId, String(jobId)),
            eq(jobs.status, "completed")
          ),
      });

      if (!job) {
        logfire.error(`Job not found, not completed, or unauthorized for ${session.user.name} with jobId: ${jobId}`);
        return NextResponse.json(
          { error: "Job not found, not completed, or unauthorized" },
          { status: 404 }
        );
      }

      // Download from R2 using AWS SDK
      try {
        logfire.info(`Downloading from R2 for ${session.user.name} with jobId: ${jobId}`);
        const R2_ACCOUNT_ID = process.env.CF_R2_ACCOUNTID;
        const R2_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
        const R2_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
        const R2_BUCKET_NAME = process.env.CF_R2_BUCKET_NAME;

        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
          logfire.error("R2 configuration missing - check environment variables");
          console.error("R2 configuration missing - check environment variables");
          return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 }
          );
        }

        logfire.info(`Creating S3 client for R2 for ${session.user.name} with jobId: ${jobId}`);
        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
          },
        });

        // Download the file
        const command = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: job.r2Key,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
          logfire.error(`File not found in R2 for ${session.user.name} with jobId: ${jobId}`);
          return NextResponse.json(
            { error: "File not found in R2" },
            { status: 404 }
          );
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        const reader = response.Body.transformToWebStream().getReader();
        logfire.info(`Reading stream from R2 for ${session.user.name} with jobId: ${jobId}`);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }

        const buffer = Buffer.concat(chunks);

        // Return file as download
        // Sanitize jobId for filename to prevent path traversal
        const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "_");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="training-checkpoint-job-${safeJobId}.zip"`,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "no-store", // Prevent caching of sensitive files
          },
        });
      } catch (s3Error: any) {
        logfire.error(`Error downloading from R2 for ${session.user.name} with jobId: ${jobId}: ${s3Error}`);
        console.error("Error downloading from R2:", s3Error);
        // Don't leak internal error details to client
        return NextResponse.json(
          { error: "Failed to download checkpoint" },
          { status: 500 }
        );
      }
    } catch (error: any) {
      logfire.error(`Error in download endpoint: ${error}`);
      console.error("Error in download endpoint:", error);
      // Don't leak internal error details to client
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
