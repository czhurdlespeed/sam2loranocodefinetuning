"use client";

import { createAuthClient } from "better-auth/react";

function getBaseURL(): string | undefined {
  // In production, prioritize NEXT_PUBLIC_BETTER_AUTH_URL to ensure custom domain is used
  // This prevents OAuth redirect URI mismatches
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    const url = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
    // Ensure it has a protocol
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  }
  
  // In production, avoid falling back to window.location.origin as it might be Vercel URL
  // Only use window.location.origin in development/preview
  if (typeof window !== "undefined") {
    const isProduction = process.env.NODE_ENV === "production";
    // In production, only use window.location.origin if we're on the custom domain
    // Otherwise, return undefined to let better-auth handle it
    if (!isProduction || window.location.hostname === "nocodefinetuning.calvinwetzel.dev") {
      return window.location.origin;
    }
  }
  return undefined;
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
