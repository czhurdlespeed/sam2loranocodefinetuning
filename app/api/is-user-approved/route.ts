import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { db } from "@/src/db";

/**
 * POST endpoint used by the LiveKit embed to check if the current user is approved.
 * Returns { approved: boolean } so the embed can gate access.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ approved: false }, { status: 401 });
    }

    const user = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ approved: false }, { status: 404 });
    }

    return NextResponse.json({ approved: user.approved });
  } catch {
    return NextResponse.json(
      { approved: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
