import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { user, account } from "@/src/db/schema";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import * as logfire from "logfire";

// Admin secret to protect this endpoint
// Fail if not set - never default to empty string
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
    throw new Error("ADMIN_SECRET environment variable is required");
}

/**
 * Admin endpoint to create users with email, name, and password.
 * Password is automatically hashed before storage.
 * 
 * Usage:
 * POST /api/admin/create-user
 * Headers: { "Authorization": "Bearer YOUR_ADMIN_SECRET" }
 * Body: { "email": "user@example.com", "name": "User Name", "password": "securepassword" }
 */
export async function POST(req: NextRequest) {
    return logfire.span("Create User", {}, {}, async () => {
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
            const { email, name, password } = body;

            // Validate input
            if (!email || !name || !password) {
                logfire.error("Missing required fields: email, name, password");
                return NextResponse.json(
                    { error: "Missing required fields: email, name, password" },
                    { status: 400 }
                );
            }
            logfire.info(`Creating user with email: ${email}, name: ${name}, password: ${password}`);

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                logfire.error(`Invalid email format: ${email}`);
                return NextResponse.json(
                    { error: "Invalid email format" },
                    { status: 400 }
                );
            }

            // Validate password strength (minimum 8 characters, max 128)
            if (password.length < 8) {
                logfire.error(`Password must be at least 8 characters long: ${password}`);
                return NextResponse.json(
                    { error: "Password must be at least 8 characters long" },
                    { status: 400 }
                );
            }
            if (password.length > 128) {
                logfire.error(`Password must be at most 128 characters long: ${password}`);
                return NextResponse.json(
                    { error: "Password must be at most 128 characters long" },
                    { status: 400 }
                );
            }

            // Validate name length
            if (name.length > 255) {
                logfire.error(`Name must be at most 255 characters long: ${name}`);
                return NextResponse.json(
                    { error: "Name must be at most 255 characters long" },
                    { status: 400 }
                );
            }

            // Check if user already exists
            const existingUser = await db.query.user.findFirst({
                where: (users, { eq }) => eq(users.email, email),
            });

            if (existingUser) {
                logfire.info(`User ${existingUser.name} with email ${email} already exists`);
                return NextResponse.json(
                    { error: "User with this email already exists" },
                    { status: 409 }
                );
            }

            // Generate UUID for user
            const userId = randomUUID();

            // Hash password with bcrypt (12 rounds for better security)
            // Note: 12 rounds is a good balance between security and performance
            const hashedPassword = await hash(password, 12);

            // Create user and account in a transaction
            await db.transaction(async (tx) => {
                // Insert user (admin-created users are pre-approved)
                logfire.info(`Inserting user with id: ${userId}, name: ${name}, email: ${email}`);
                await tx.insert(user).values({
                    id: userId,
                    name,
                    email,
                    emailVerified: false,
                    approved: true, // Admin-created users are automatically approved
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Insert account with hashed password
                // better-auth uses providerId: "credential" for email/password accounts
                logfire.info(`Inserting account with id: ${randomUUID()}, accountId: ${userId}, providerId: credential, userId: ${userId}`);
                await tx.insert(account).values({
                    id: randomUUID(),
                    accountId: userId, // For credential provider, accountId is same as userId
                    providerId: "credential",
                    userId: userId,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            });

            logfire.info(`User created successfully with id: ${userId}, email: ${email}, name: ${name}`);
            return NextResponse.json({
                success: true,
                message: "User created successfully",
                user: {
                    id: userId,
                    email,
                    name,
                },
            });
        } catch (error: any) {
            logfire.error(`Error creating user: ${error}`);
            console.error("Error creating user:", error);
            // Don't leak internal error details to client
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}
