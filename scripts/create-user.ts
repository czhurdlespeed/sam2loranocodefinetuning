#!/usr/bin/env tsx
/**
 * Script to create a user in the database
 * 
 * Usage:
 *   tsx scripts/create-user.ts <email> <name> <password>
 * 
 * Or set environment variables:
 *   ADMIN_SECRET=your-secret tsx scripts/create-user.ts <email> <name> <password>
 */

import { db } from "../src/db";
import { user, account } from "../src/db/schema";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";

async function createUser(email: string, name: string, password: string) {
    try {
        // Validate input
        if (!email || !name || !password) {
            console.error("Error: Missing required fields (email, name, password)");
            process.exit(1);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.error("Error: Invalid email format");
            process.exit(1);
        }

        // Validate password strength
        if (password.length < 8) {
            console.error("Error: Password must be at least 8 characters long");
            process.exit(1);
        }

        // Check if user already exists
        const existingUser = await db.query.user.findFirst({
            where: (users, { eq }) => eq(users.email, email),
        });

        if (existingUser) {
            console.error(`Error: User with email ${email} already exists`);
            process.exit(1);
        }

        // Generate UUID for user
        const userId = randomUUID();

        const hashedPassword = await hash(password, 12);

        // Create user and account in a transaction
        await db.transaction(async (tx) => {
            // Insert user (admin-created users are pre-approved)
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
    } catch (error: any) {
        console.error("Error creating user:", error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 3) {
    console.error("Usage: tsx scripts/create-user.ts <email> <name> <password>");
    console.error("Example: tsx scripts/create-user.ts user@example.com 'John Doe' 'securepassword123'");
    process.exit(1);
}

const [email, name, password] = args;

createUser(email, name, password);
