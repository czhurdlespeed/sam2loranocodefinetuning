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
  const injected = useRef(false);

  useEffect(() => {
    if (isPending || injected.current) return;

    const userId = session?.user?.id ?? DEFAULT_USER_ID;
    const name = session?.user?.name ?? undefined;
    const email =
      typeof session?.user?.email === "string"
        ? session.user.email
        : undefined;

    if (document.getElementById(SCRIPT_ID)) {
      injected.current = true;
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    // Use same-origin URL so the browser never hits the protected embed directly
    script.src =
      typeof window !== "undefined"
        ? `${window.location.origin}${EMBED_SCRIPT_URL}`
        : EMBED_SCRIPT_URL;
    script.setAttribute(
      "data-lk-sandbox-id",
      typeof window !== "undefined" ? window.location.origin : ""
    );
    script.setAttribute("data-lk-user-id", userId);
    if (name) script.setAttribute("data-lk-name", name);
    if (email) script.setAttribute("data-lk-email", email);
    script.async = true;

    document.body.appendChild(script);
    injected.current = true;
  }, [session?.user?.id, session?.user?.name, session?.user?.email, isPending]);

  return null;
}
