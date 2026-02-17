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
  document.getElementById(SCRIPT_ID)?.remove();
  document.getElementById("lk-embed-wrapper")?.remove();
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
    const userIdChanged = lastUserIdRef.current !== userId;

    // On login or logout: remove old script and all embed UI, then inject a fresh script.
    if (userIdChanged) {
      removeExistingEmbed();
    }
    lastUserIdRef.current = userId;

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript && !userIdChanged) {
      // Same user: only update name/email attributes
      existingScript.setAttribute("data-lk-user-id", userId);
      if (name) existingScript.setAttribute("data-lk-name", name);
      else existingScript.removeAttribute("data-lk-name");
      if (email) existingScript.setAttribute("data-lk-email", email);
      else existingScript.removeAttribute("data-lk-email");
      existingScript.setAttribute(
        "data-lk-sandbox-id",
        typeof window !== "undefined" ? window.location.origin : "",
      );
      return;
    }

    // No script in document (first load or we just removed it on login/logout) — inject new one
    const inject = () => {
      if (document.getElementById(SCRIPT_ID)) return; // avoid duplicate if effect re-runs
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
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
    };

    if (userIdChanged) {
      // Defer inject to next tick so old embed’s DOM and timers are fully cleared
      const t = setTimeout(inject, 0);
      return () => clearTimeout(t);
    }
    inject();
  }, [session?.user?.id, session?.user?.name, session?.user?.email, isPending]);

  return null;
}
