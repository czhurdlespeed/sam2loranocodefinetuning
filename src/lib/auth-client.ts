"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: (() => {
    // Use explicit env var if provided
    if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
      const url = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
      // Ensure it has a protocol
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }
      return `https://${url}`;
    }
    // Fallback to current origin (includes protocol)
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return undefined;
  })(),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
