import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";
import { trainingJob } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all jobs for the user
    const jobs = await db
      .select()
      .from(trainingJob)
      .where(eq(trainingJob.userId, session.user.id))
      .orderBy(desc(trainingJob.createdAt));

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error("Error in jobs endpoint:", error);
    // Don't leak internal error details to client
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
