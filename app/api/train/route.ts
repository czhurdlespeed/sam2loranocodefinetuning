import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";
import { trainingJob } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Modal endpoint URLs - validate at startup
const MODAL_TRAIN_URL = process.env.MODAL_TRAIN_URL;
const MODAL_KEY = process.env.MODAL_KEY;
const MODAL_SECRET = process.env.MODAL_SECRET;

if (!MODAL_TRAIN_URL || !MODAL_KEY || !MODAL_SECRET) {
  throw new Error("Missing required environment variables: MODAL_TRAIN_URL, MODAL_KEY, MODAL_SECRET");
}

export async function POST(req: NextRequest) {
  try {
    // Limit request body size to prevent DoS (10MB max)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }

    // Authenticate user
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user exists in database and is approved (authorization check)
    const user = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not authorized to train models" },
        { status: 403 }
      );
    }

    // Check if user is approved by admin
    if (!user.approved) {
      return NextResponse.json(
        { error: "Your account is pending admin approval. Please wait for approval before training models." },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { rank, checkpoint, dataset, epochs, fullfinetune } = body;

    // Validate input types and values
    if (!rank || !checkpoint || !dataset || !epochs) {
      return NextResponse.json(
        { error: "Missing required fields: rank, checkpoint, dataset, epochs" },
        { status: 400 }
      );
    }

    // Validate types
    if (typeof epochs !== "number" || epochs < 1 || epochs > 100) {
      return NextResponse.json(
        { error: "epochs must be a number between 1 and 100" },
        { status: 400 }
      );
    }

    if (typeof rank !== "number" || ![2, 4, 8, 16, 32].includes(rank)) {
      return NextResponse.json(
        { error: "rank must be one of: 2, 4, 8, 16, 32" },
        { status: 400 }
      );
    }

    if (typeof checkpoint !== "string" || !["tiny", "small", "base_plus", "large"].includes(checkpoint)) {
      return NextResponse.json(
        { error: "checkpoint must be one of: tiny, small, base_plus, large" },
        { status: 400 }
      );
    }

    if (typeof dataset !== "string" || !["irPOLYMER", "visPOLYMER", "TIG", "MAZAK"].includes(dataset)) {
      return NextResponse.json(
        { error: "dataset must be one of: irPOLYMER, visPOLYMER, TIG, MAZAK" },
        { status: 400 }
      );
    }

    // Get the next job_id for this user (count existing completed jobs + 1)
    // Only count completed jobs since we only store successful jobs
    const existingJobsCount = await db
      .select()
      .from(trainingJob)
      .where(eq(trainingJob.userId, session.user.id));

    const nextJobId = String(existingJobsCount.length + 1);

    // Map frontend values to Modal API format
    const loraRankMap: Record<number, 2 | 4 | 8 | 16 | 32> = {
      2: 2,
      4: 4,
      8: 8,
      16: 16,
      32: 32,
    };

    const checkpointMap: Record<string, "tiny" | "small" | "base_plus" | "large"> = {
      tiny: "tiny",
      small: "small",
      base_plus: "base_plus",
      large: "large",
    };

    const datasetMap: Record<string, "irPOLYMER" | "visPOLYMER" | "TIG" | "MAZAK"> = {
      irPOLYMER: "irPOLYMER",
      visPOLYMER: "visPOLYMER",
      TIG: "TIG",
      MAZAK: "MAZAK",
    };

    // Prepare Modal API request
    const modalRequest = {
      userjob: {
        user_id: session.user.id,
        job_id: parseInt(nextJobId),
      },
      fullfinetune: fullfinetune || false,
      lora_rank: fullfinetune ? null : (loraRankMap[rank] || 4),
      base_model: checkpointMap[checkpoint] || "large",
      dataset: datasetMap[dataset] || "irPOLYMER",
      num_epochs: epochs,
    };

    // Proxy request to Modal with streaming
    const modalResponse = await fetch(MODAL_TRAIN_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Modal-Key": MODAL_KEY!,
        "Modal-Secret": MODAL_SECRET!,
      },
      body: JSON.stringify(modalRequest),
    });

    if (!modalResponse.ok) {
      // No job to delete - we don't create jobs until they complete successfully
      const errorText = await modalResponse.text();
      return NextResponse.json(
        { error: `Modal API error: ${errorText}` },
        { status: modalResponse.status }
      );
    }

    // Return streaming response with job info in headers
    return new Response(modalResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Job-Id": nextJobId,
        "X-User-Id": session.user.id,
      },
    });
  } catch (error: any) {
    console.error("Error in train endpoint:", error);
    // No job to delete - we don't create jobs until they complete successfully
    // Don't leak internal error details to client
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
