import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db"; // Use relative import for CLI compatibility
import { user, account } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
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
      // Use dev credentials when not on Vercel (VERCEL_ENV unset); otherwise use prod
      clientId: process.env.VERCEL_ENV ? process.env.BETTER_AUTH_GITHUB_CLIENT_ID! : process.env.BETTER_AUTH_GITHUB_CLIENT_ID_DEV!,
      clientSecret: process.env.VERCEL_ENV ? process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET! : process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET_DEV!,
    },
    google: {
      clientId: process.env.VERCEL_ENV ? process.env.BETTER_AUTH_GOOGLE_CLIENT_ID! : process.env.BETTER_AUTH_GOOGLE_CLIENT_ID_DEV!,
      clientSecret: process.env.VERCEL_ENV ? process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET! : process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET_DEV!,
    },
  },
  baseURL: (() => {
    // In production, prioritize PRODUCTION_URL to ensure custom domain is used
    // This prevents OAuth redirect URI mismatches with Vercel URLs
    let url: string | undefined;
    if (process.env.VERCEL_ENV === "production") {
      url = process.env.PRODUCTION_URL;
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL = url;
      process.env.BETTER_AUTH_URL = url;
    } else if (process.env.VERCEL_ENV === "preview") {
      // VERCEL_URL is just the domain, so prepend https://
      const vercelUrl = process.env.VERCEL_URL;
      url = vercelUrl?.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL = url;
      process.env.BETTER_AUTH_URL = url;
    } else {
      url = process.env.DEV_URL;
    }
    if (!url) return undefined;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  })(),
  basePath: "/api/auth",
  trustedOrigins: async (request) => {
    const origins: string[] = [];

    if (process.env.VERCEL_ENV === "production") {
      const url = process.env.PRODUCTION_URL!;
      // Normalize: remove trailing slash, ensure it's a valid origin
      origins.push(url.replace(/\/$/, ""));
    } else if (process.env.VERCEL_ENV === "preview") {
      // For preview deployments, dynamically allow the request origin
      // This handles dynamic preview URLs that Vercel generates
      if (request) {
        const origin = request.headers.get("origin");
        if (origin) {
          const normalizedOrigin = origin.replace(/\/$/, "");
          // Check if it's a Vercel preview URL pattern and allow it
          if (normalizedOrigin.match(/^https:\/\/.*\.vercel\.app$/)) {
            origins.push(normalizedOrigin);
          }
        }
      }
      
      // Also include the specific VERCEL_URL if available
      const vercelUrl = process.env.VERCEL_URL;
      if (vercelUrl) {
        let normalizedUrl = vercelUrl.startsWith("http") 
          ? vercelUrl 
          : `https://${vercelUrl}`;
        normalizedUrl = normalizedUrl.replace(/\/$/, "");
        origins.push(normalizedUrl);
      }
      
      // Also include production URL in preview for potential redirects
      if (process.env.PRODUCTION_URL) {
        origins.push(process.env.PRODUCTION_URL.replace(/\/$/, ""));
      }
    } else {
      const devUrl = process.env.DEV_URL!;
      origins.push(devUrl.replace(/\/$/, ""));
    }
    
    return origins;
  },
  secret: (() => {
    const secret = process.env.BETTER_AUTH_SECRET;
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
        // Only process true signups (email or OAuth), not sign-ins.
        // For email: path is /sign-up/email. For OAuth: path includes /callback/;
        // we distinguish new OAuth signups from returning OAuth sign-ins below.
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

        const now = new Date();
        const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);

        // New signup = user row created very recently (email or OAuth signup)
        const userCreatedRecently =
          dbUser.createdAt.getTime() > tenSecondsAgo.getTime();

        // For OAuth callbacks, also treat as signup if an account was just created
        // (covers cases where user creation timing differs from session creation)
        let accountCreatedRecently = false;
        if (isOAuthCallback) {
          const recentAccount = await db.query.account.findFirst({
            where: and(
              eq(account.userId, newUser.id),
              gt(account.createdAt, tenSecondsAgo)
            ),
            columns: { id: true },
          });
          accountCreatedRecently = !!recentAccount;
        }

        const isNewSignup = userCreatedRecently || accountCreatedRecently;

        // Only process if this is a new signup and not already approved
        if (isNewSignup && !dbUser.approved) {
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
