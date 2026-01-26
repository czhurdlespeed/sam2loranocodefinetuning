import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import * as logfire from "logfire";
// Validate environment variables at startup
const MODAL_CANCEL_URL = process.env.MODAL_CANCEL_URL;
const MODAL_KEY = process.env.MODAL_KEY;
const MODAL_SECRET = process.env.MODAL_SECRET;

if (!MODAL_CANCEL_URL || !MODAL_KEY || !MODAL_SECRET) {
  throw new Error("Missing required environment variables: MODAL_CANCEL_URL, MODAL_KEY, MODAL_SECRET");
}

export async function POST(req: NextRequest) {
  return logfire.span("Cancel", {}, {}, async () => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session?.user) {
        logfire.error("Unauthorized");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const { userId, jobId } = body;

      if (!userId || !jobId) {
        logfire.error("Missing userId or jobId");
        return NextResponse.json(
          { error: "Missing userId or jobId" },
          { status: 400 }
        );
      }
      logfire.info(`Cancelling job for userId: ${userId}, jobId: ${jobId}`);

      // Validate that userId matches session user (prevent IDOR)
      if (userId !== session.user.id) {
        logfire.error(`Unauthorized: userId ${userId} does not match session user ${session.user.id}`);
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
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

      // Call Modal cancel endpoint
      const user_plus_job_id = `${userId}_${jobId}`;
      if (!/^[a-zA-Z0-9_-]+$/.test(user_plus_job_id)) {
        logfire.error(`Invalid user or job ID format: ${user_plus_job_id}`);
        return NextResponse.json(
          { error: "Invalid user or job ID format" },
          { status: 400 }
        );
      }
      logfire.info(`Sending cancel request to Modal for user_plus_job_id: ${user_plus_job_id}`);
      const modalResponse = await fetch(
        `${MODAL_CANCEL_URL}?user_plus_job_id=${encodeURIComponent(user_plus_job_id)}`,
        {
          method: "POST",
          headers: {
            "Modal-Key": MODAL_KEY!,
            "Modal-Secret": MODAL_SECRET!,
          },
        }
      );

      if (!modalResponse.ok) {
        logfire.error(`Modal API error: ${modalResponse.status}`);
        const errorText = await modalResponse.text();
        return NextResponse.json(
          { error: `Modal API error: ${errorText}` },
          { status: modalResponse.status }
        );
      }

      const result = await modalResponse.json();
      return NextResponse.json(result);
    } catch (error: any) {
      logfire.error(`Error in cancel endpoint: ${error}`);
      console.error("Error in cancel endpoint:", error);
      // Don't leak internal error details to client
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
