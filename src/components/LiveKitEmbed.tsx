"use client";

import { useSession } from "@/src/lib/auth-client";
import { useEffect, useRef } from "react";

// Proxied same-origin to avoid CORB when loading from the embed project
const EMBED_SCRIPT_URL = "/api/embed-script";
// Embed uses this as the base URL for /api/connection-details and /api/is-user-approved.
// Use our app's origin so it calls our APIs (we generate tokens; no LiveKit Sandbox needed).
const DEFAULT_USER_ID = "123";
const SCRIPT_ID = "livekit-agent-embed-popup";

export function LiveKitAgentEmbed() {
  const { data: session, isPending } = useSession();
  const lastUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isPending) return;

    const userId = session?.user?.id ?? DEFAULT_USER_ID;
    const name = session?.user?.name ?? undefined;
    const email =
      typeof session?.user?.email === "string" ? session.user.email : undefined;

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const userIdChanged = lastUserIdRef.current !== userId;

    // If user ID changed from default to real user (or vice versa), re-inject script
    // This ensures the embed initializes with the correct user context
    if (existingScript && userIdChanged && lastUserIdRef.current !== undefined) {
      // Remove old script and any LiveKit embed elements
      existingScript.remove();
      // Clear any LiveKit popup/embed that might have been created
      const livekitElements = document.querySelectorAll('[data-livekit], [id^="livekit"]');
      livekitElements.forEach((el) => el.remove());
    }

    lastUserIdRef.current = userId;

    if (existingScript && !userIdChanged) {
      // Script exists and user ID hasn't changed - just update attributes
      existingScript.setAttribute("data-lk-user-id", userId);
      if (name) {
        existingScript.setAttribute("data-lk-name", name);
      } else {
        existingScript.removeAttribute("data-lk-name");
      }
      if (email) {
        existingScript.setAttribute("data-lk-email", email);
      } else {
        existingScript.removeAttribute("data-lk-email");
      }
      // Update sandbox ID in case origin changed
      existingScript.setAttribute(
        "data-lk-sandbox-id",
        typeof window !== "undefined" ? window.location.origin : "",
      );
      return;
    }

    // Script doesn't exist or was removed - create and inject it
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    // Use same-origin URL so the browser never hits the protected embed directly
    script.src =
      typeof window !== "undefined"
        ? `${window.location.origin}${EMBED_SCRIPT_URL}`
        : EMBED_SCRIPT_URL;
    script.setAttribute(
      "data-lk-sandbox-id",
      typeof window !== "undefined" ? window.location.origin : "",
    );
    script.setAttribute("data-lk-user-id", userId);
    if (name) script.setAttribute("data-lk-name", name);
    if (email) script.setAttribute("data-lk-email", email);
    script.async = true;

    document.body.appendChild(script);
  }, [session?.user?.id, session?.user?.name, session?.user?.email, isPending]);

  return null;
}
