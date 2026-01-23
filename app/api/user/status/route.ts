import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";

/**
 * GET endpoint to check the current user's approval status.
 * Returns whether the authenticated user is approved to train models.
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      approved: user.approved,
      userId: user.id,
    });
  } catch (error: any) {
    console.error("Error in user status endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
