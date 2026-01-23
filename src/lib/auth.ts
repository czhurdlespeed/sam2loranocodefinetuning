import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db"; // Use relative import for CLI compatibility
import { user } from "../db/schema";
import { eq } from "drizzle-orm";
import { sendSignupNotification } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // PostgreSQL provider for Neon
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true when ready
    autoSignIn: true, // Auto sign-in after signup for both email and OAuth
  },
  socialProviders: {
    github: {
      clientId: process.env.BETTER_AUTH_GITHUB_CLIENT_ID || "",
      clientSecret: process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET || "",
    },
  },
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/api/auth",
  secret: (() => {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      throw new Error("BETTER_AUTH_SECRET environment variable is required in production");
    }
    return secret;
  })(),
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Handle both email signups and OAuth callbacks (GitHub, Google) for new user signups
      // Better-auth uses paths like /sign-up/email or /sign-up-email
      const isSignUp = ctx.path === "/sign-up/email";
      const isOAuthCallback = ctx.path?.includes("/callback/");

      // Check if a new session was created (indicating a new user signup)
      // This works for both email and OAuth signups now that autoSignIn is enabled
      const newSession = ctx.context?.newSession;
      const newUser = newSession?.user;

      // Process both email signups and OAuth callbacks
      if ((isSignUp || isOAuthCallback) && newUser?.id) {
        try {
          // Get the user from database to check their current state
          const dbUser = await db.query.user.findFirst({
            where: (users, { eq }) => eq(users.id, newUser.id),
          });

          if (!dbUser) {
            // User doesn't exist yet (shouldn't happen, but handle gracefully)
            return;
          }

          // Check if user was just created (within last 10 seconds)
          // This helps distinguish new signups from existing user logins
          const userCreatedAt = dbUser.createdAt;
          const now = new Date();
          const secondsSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000;
          const isNewUser = secondsSinceCreation < 10;

          // Only process if this appears to be a new user signup
          // If user is already approved, they're an existing user logging in
          if (isNewUser && !dbUser.approved) {
            // Ensure user is set to unapproved
            await db
              .update(user)
              .set({ approved: false })
              .where(eq(user.id, newUser.id));

            // Send email notification to admin (non-blocking)
            sendSignupNotification(
              newUser.email,
              newUser.name || "Unknown"
            ).catch((error) => {
              console.error("Failed to send signup notification email:", error);
            });
          }
        } catch (error) {
          // Log error but don't fail the auth flow
          console.error("Error in signup hook:", error);
        }
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
