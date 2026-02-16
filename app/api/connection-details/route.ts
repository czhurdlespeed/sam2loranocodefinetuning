import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

/**
 * Generates LiveKit connection details (room + participant token) for the embed.
 * Set LIVEKIT_URL (e.g. wss://your-project.livekit.cloud), LIVEKIT_API_KEY, and
 * LIVEKIT_API_SECRET in your env so tokens match your LiveKit project and agent.
 */
export async function POST(req: NextRequest) {
  if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      {
        error:
          "LiveKit not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const agentName = body?.room_config?.agents?.[0]?.agent_name as
      | string
      | undefined;
    // Lemonslice agent requires user_id in job metadata or it rejects the job
    const userId = body?.user_id as string | undefined;

    const participantName = "user";
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    const metadata =
      userId != null && userId !== ""
        ? JSON.stringify({ user_id: userId })
        : "";

    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      ttl: "15m",
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    if (agentName) {
      at.roomConfig = new RoomConfiguration({
        agents: [new RoomAgentDispatch({ agentName, metadata })],
      });
    }

    const participantToken = await at.toJwt();

    // Client expects wss://; convert https:// if needed
    const serverUrl =
      LIVEKIT_URL.startsWith("https://") && !LIVEKIT_URL.startsWith("wss")
        ? LIVEKIT_URL.replace(/^https:\/\//, "wss://")
        : LIVEKIT_URL;

    return NextResponse.json(
      {
        serverUrl,
        roomName,
        participantName,
        participantToken,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to generate connection details" },
      { status: 500 }
    );
  }
}
