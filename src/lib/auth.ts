import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db"; // Use relative import for CLI compatibility

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // PostgreSQL provider for Neon
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true when ready
    autoSignIn: false, // Disable auto-signin - users need admin approval first
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
});

export type Session = typeof auth.$Infer.Session;
