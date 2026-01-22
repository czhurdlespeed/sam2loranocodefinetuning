import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";
import { trainingJob } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

// Validate environment variables at startup
const MODAL_CANCEL_URL = process.env.MODAL_CANCEL_URL;
const MODAL_KEY = process.env.MODAL_KEY;
const MODAL_SECRET = process.env.MODAL_SECRET;

if (!MODAL_CANCEL_URL || !MODAL_KEY || !MODAL_SECRET) {
  throw new Error("Missing required environment variables: MODAL_CANCEL_URL, MODAL_KEY, MODAL_SECRET");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, jobId } = body;

    if (!userId || !jobId) {
      return NextResponse.json(
        { error: "Missing userId or jobId" },
        { status: 400 }
      );
    }

    // Validate that userId matches session user (prevent IDOR)
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Validate types
    if (typeof jobId !== "string" && typeof jobId !== "number") {
      return NextResponse.json(
        { error: "Invalid jobId type" },
        { status: 400 }
      );
    }

    // No need to check database - jobs are only created when they complete successfully
    // Cancelled jobs are never in the database, so we just need to cancel via Modal API

    // Call Modal cancel endpoint
    const user_plus_job_id = `${userId}_${jobId}`;
    if (!/^[a-zA-Z0-9_-]+$/.test(user_plus_job_id)) {
      return NextResponse.json(
        { error: "Invalid user or job ID format" },
        { status: 400 }
      );
    }
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
      const errorText = await modalResponse.text();
      return NextResponse.json(
        { error: `Modal API error: ${errorText}` },
        { status: modalResponse.status }
      );
    }

    const result = await modalResponse.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in cancel endpoint:", error);
    // Don't leak internal error details to client
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
