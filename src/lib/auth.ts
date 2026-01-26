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
  baseURL: (() => {
    const url = process.env.VERCEL_URL || process.env.BETTER_AUTH_URL;
    if (!url) return undefined;
    // VERCEL_URL doesn't include protocol, so add https://
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  })(),
  basePath: "/api/auth",
  trustedOrigins: (() => {
    const origins: string[] = [];
    if (process.env.VERCEL_URL) {
      origins.push(`https://${process.env.VERCEL_URL}`);
    }
    if (process.env.BETTER_AUTH_URL) {
      const url = process.env.BETTER_AUTH_URL;
      origins.push(url.startsWith("http://") ? url : `https://${url}`);
    }
    if (process.env.VERCEL_PROJECT_NAME) {
      origins.push(`https://${process.env.VERCEL_PROJECT_NAME}-*.vercel.app`);
    }
    origins.push("http://localhost:3000");
    origins.push("https://nocodefinetuning.calvinwetzel.dev");
    return origins;

  })(),
  secret: (() => {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      throw new Error("BETTER_AUTH_SECRET environment variable is required in production");
    }
    return secret;
  })(),
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Only process new signups, not existing user logins
      // Early exit for non-signup paths to avoid unnecessary database queries
      const isSignUp = ctx.path === "/sign-up/email";
      const isOAuthCallback = ctx.path?.includes("/callback/");

      if (!isSignUp && !isOAuthCallback) {
        return; // Skip for non-signup/auth flows
      }

      // Check if a new session was created (indicating a new user signup)
      const newSession = ctx.context?.newSession;
      const newUser = newSession?.user;

      // Only process if we have a new user (signup scenario)
      if (!newUser?.id) {
        return; // Existing user login, skip processing
      }

      try {
        // Optimize: Only query database if we suspect this is a new signup
        // For OAuth callbacks, better-auth creates the user before this hook runs
        // So we can check the createdAt timestamp to determine if it's truly new
        const dbUser = await db.query.user.findFirst({
          where: (users, { eq }) => eq(users.id, newUser.id),
          columns: {
            id: true,
            approved: true,
            createdAt: true,
          },
        });

        if (!dbUser) {
          return; // User doesn't exist (shouldn't happen)
        }

        // Check if user was just created (within last 10 seconds)
        // This distinguishes new signups from existing user logins
        const userCreatedAt = dbUser.createdAt;
        const now = new Date();
        const secondsSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000;
        const isNewUser = secondsSinceCreation < 10;

        // Only process if this is a new user signup and not already approved
        if (isNewUser && !dbUser.approved) {
          // Ensure user is set to unapproved (idempotent operation)
          await db
            .update(user)
            .set({ approved: false })
            .where(eq(user.id, newUser.id));

          // Send email notification to admin (non-blocking, fire-and-forget)
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
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
