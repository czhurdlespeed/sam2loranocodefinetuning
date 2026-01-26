import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { user } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import * as logfire from "logfire";

// Admin secret to protect this endpoint
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
    throw new Error("ADMIN_SECRET environment variable is required");
}

/**
 * Admin endpoint to approve pending users.
 * 
 * Usage:
 * POST /api/admin/approve-user
 * Headers: { "Authorization": "Bearer YOUR_ADMIN_SECRET" }
 * Body: { "userId": "user-uuid-here" }
 */
export async function POST(req: NextRequest) {
    logfire.span("approve user", {}, {}, async () => {
        try {
            // Verify admin secret
            const authHeader = req.headers.get("authorization");
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                logfire.error("Missing or invalid authorization header");
                return NextResponse.json(
                    { error: "Missing or invalid authorization header" },
                    { status: 401 }
                );
            }

            const token = authHeader.substring(7);
            if (token !== ADMIN_SECRET) {
                logfire.error(`Invalid admin secret: ${token} !== ${ADMIN_SECRET}`);
                return NextResponse.json(
                    { error: "Invalid admin secret" },
                    { status: 401 }
                );
            }

            const body = await req.json();
            const { userId } = body;

            if (!userId || typeof userId !== "string") {
                logfire.error(`Missing or invalid userId: ${userId}`);
                return NextResponse.json(
                    { error: "Missing or invalid userId" },
                    { status: 400 }
                );
            }

            // Find the user
            const existingUser = await db.query.user.findFirst({
                where: (users, { eq }) => eq(users.id, userId),
            });

            if (!existingUser) {
                logfire.error(`User not found for userId: ${userId}`);
                return NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
            }

            if (existingUser.approved) {
                logfire.error(`User is already approved for userId: ${userId}`);
                return NextResponse.json(
                    { error: "User is already approved" },
                    { status: 400 }
                );
            }

            // Approve the user
            await db
                .update(user)
                .set({ approved: true })
                .where(eq(user.id, userId));

            logfire.info(`User approved successfully for userId: ${userId}`);
            return NextResponse.json({
                success: true,
                message: "User approved successfully",
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    name: existingUser.name,
                },
            });
        } catch (error: any) {
            logfire.error(`Error approving user: ${error}`);
            console.error("Error approving user:", error);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}

/**
 * GET endpoint to list pending users (users awaiting approval)
 */
export async function GET(req: NextRequest) {
    try {
        // Verify admin secret
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing or invalid authorization header" },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        if (token !== ADMIN_SECRET) {
            return NextResponse.json(
                { error: "Invalid admin secret" },
                { status: 401 }
            );
        }

        // Get all unapproved users
        const pendingUsers = await db.query.user.findMany({
            where: (users, { eq }) => eq(users.approved, false),
            orderBy: (users, { desc }) => [desc(users.createdAt)],
        });

        return NextResponse.json({
            success: true,
            pendingUsers: pendingUsers.map((u) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                createdAt: u.createdAt,
            })),
        });
    } catch (error: any) {
        console.error("Error fetching pending users:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
