"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "../constants/trainingConfig";

type Stage = "idle" | "submitting" | "pending" | "running" | "completed" | "failed" | "cancelling";

export function useTrainingLogs(
  training: boolean,
  userId: string,
  onStageChange: (stage: Stage) => void,
  sessionToken: string | null
) {
  const [logs, setLogs] = useState<string[]>([]);

  // Use SSE (Server-Sent Events) for real-time logs and status updates
  useEffect(() => {
    if (!training || !userId || !onStageChange || !sessionToken) return;

    let eventSource: EventSource | null = null;

    // EventSource doesn't support custom headers, so we pass token as query param
    const setupEventSource = () => {
      try {
        const url = `${API_BASE_URL}/logs/${userId}?token=${encodeURIComponent(
          sessionToken
        )}`;
        eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "log") {
              setLogs((prevLogs) => [...prevLogs, data.content]);
            } else if (data.type === "status") {
              if (
                data.status === "pending" ||
                data.status === "running" ||
                data.status === "completed" ||
                data.status === "failed"
              ) {
                onStageChange(data.status);
              }
              if (data.status === "pending") {
                setLogs((prevLogs) => [...prevLogs, "Job is pending..."]);
              }
              if (data.status === "completed" || data.status === "failed") {
                eventSource?.close();
              }
            } else if (data.type === "connected") {
              console.log("Connected to log stream");
            } else if (data.type === "error") {
              console.error("Error:", data.message);
              setLogs((prevLogs) => [...prevLogs, `Error: ${data.message}`]);
              eventSource?.close();
            }
          } catch (error) {
            console.error("Error parsing SSE data:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("EventSource error:", error);
          eventSource?.close();
        };
      } catch (error) {
        console.error("Error setting up EventSource:", error);
      }
    };

    setupEventSource();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [
    training,
    userId,
    onStageChange,
    sessionToken,
  ]);

  return { logs, setLogs };
}
