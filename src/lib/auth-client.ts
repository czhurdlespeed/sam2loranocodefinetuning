"use client";

import { createAuthClient } from "better-auth/react";

function getBaseURL(): string | undefined {
  // In production, prioritize NEXT_PUBLIC_BETTER_AUTH_URL to ensure custom domain is used
  // This prevents OAuth redirect URI mismatches
  if (process.env.VERCEL_ENV === "production") {
    return process.env.PRODUCTION_URL;
  } else if (process.env.VERCEL_ENV === "preview") {
    // VERCEL_URL is just the domain, so prepend https://
    const vercelUrl = process.env.VERCEL_URL;
    return vercelUrl?.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  } else {
    return process.env.DEV_URL;
  }
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
