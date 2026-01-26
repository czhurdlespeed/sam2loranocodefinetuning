import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";
import { trainingJob } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import * as logfire from "logfire";

export async function GET(req: NextRequest) {
  return logfire.span("User's Jobs", {}, {}, async () => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      logfire.info(`Getting all jobs for ${session.user.name}`);

      // Get all jobs for the user
      const jobs = await db
        .select()
        .from(trainingJob)
        .where(eq(trainingJob.userId, session.user.id))
        .orderBy(desc(trainingJob.createdAt));

      logfire.info(`Found ${jobs.length} jobs for ${session.user.name}`);

      return NextResponse.json({ jobs });
    } catch (error: any) {
      console.error("Error in jobs endpoint:", error);
      logfire.error(`Error in jobs endpoint: ${error}`);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
