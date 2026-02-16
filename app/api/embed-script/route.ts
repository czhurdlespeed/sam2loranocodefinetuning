import { NextResponse } from "next/server";

const EMBED_SCRIPT_ORIGIN =
  process.env.LIVEKIT_EMBED_ORIGIN ||
  "https://agent-starter-embed-git-preview-calvin-wetzels-projects.vercel.app";

/**
 * Optional. Set to the "Protection Bypass for Automation" secret from the
 * **embed** project's Vercel Deployment Protection settings so the proxy can
 * fetch the script from protected preview deployments.
 */
const BYPASS_SECRET = process.env.LIVEKIT_EMBED_BYPASS_SECRET;

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: "application/javascript, */*",
    };
    if (BYPASS_SECRET) {
      headers["x-vercel-protection-bypass"] = BYPASS_SECRET;
    }

    const res = await fetch(`${EMBED_SCRIPT_ORIGIN}/embed-popup.js`, {
      cache: "no-store",
      headers,
    });

    if (!res.ok) {
      const message =
        res.status === 401
          ? "Embed script returned 401. If the embed project has Vercel Deployment Protection, set LIVEKIT_EMBED_BYPASS_SECRET to that project's Protection Bypass secret."
          : "Embed script unavailable";
      return new NextResponse(message, { status: res.status });
    }

    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch {
    return new NextResponse("Embed script unavailable", { status: 502 });
  }
}
