"use client";

import { useSession } from "@/src/lib/auth-client";
import { useEffect, useRef } from "react";

// Proxied same-origin to avoid CORB when loading from the embed project
const EMBED_SCRIPT_URL = "/api/embed-script";
// Embed uses this as the base URL for /api/connection-details and /api/is-user-approved.
// Use our app's origin so it calls our APIs (we generate tokens; no LiveKit Sandbox needed).
const DEFAULT_USER_ID = "123";
const SCRIPT_ID = "livekit-agent-embed-popup";

/** Remove the embed script and all UI the embed may have created so a fresh inject doesn't layer on top. */
function removeExistingEmbed(): void {
  const script = document.getElementById(SCRIPT_ID);
  script?.remove();

  const selectors = [
    "[data-livekit]",
    "[id^='livekit']",
    "[id*='livekit']",
    "[id*='embed-popup']",
    "[id*='agent-embed']",
    "[class*='lk-']",
    "[class*='livekit']",
  ];
  selectors.forEach((sel) => {
    try {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    } catch {
      // ignore invalid selector
    }
  });

  // Embed often renders in an iframe (same-origin or embed origin)
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  document.querySelectorAll("iframe").forEach((iframe) => {
    const src = iframe.getAttribute("src") ?? "";
    if (src.startsWith(origin) || src.includes("/embed") || src.includes("embed-popup")) {
      iframe.remove();
    }
  });
}

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

    // When user logs in or out, tear down the old embed completely so the new one doesn't layer on top
    if (existingScript && userIdChanged && lastUserIdRef.current !== undefined) {
      removeExistingEmbed();
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
