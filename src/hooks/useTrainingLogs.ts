"use client";

import { useState, useEffect, useRef } from "react";

type Stage = "idle" | "submitting" | "pending" | "running" | "completed" | "failed" | "cancelling";

// Hook to handle streaming response from Modal training endpoint
export function useTrainingLogs(
  streamResponse: Response | null,
  onStageChange: (stage: Stage) => void,
  onComplete?: (status: "completed" | "failed") => void
) {
  const [logs, setLogs] = useState<string[]>([]);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    if (!streamResponse) {
      return;
    }

    // Modal streams SSE format: data: {'log': '...'}\n\n
    const processStream = async () => {
      try {
        const reader = streamResponse.body?.getReader();
        if (!reader) {
          console.error("No reader available");
          return;
        }

        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Stream completed successfully
            onStageChange("completed");
            onComplete?.("completed");
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (ending with \n\n)
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6); // Remove "data: " prefix
                const data = JSON.parse(jsonStr);

                // Handle log messages from Modal
                if (data.log) {
                  setLogs((prevLogs) => [...prevLogs, data.log]);
                }

                // Handle status updates if present
                if (data.status) {
                  if (
                    data.status === "pending" ||
                    data.status === "running" ||
                    data.status === "completed" ||
                    data.status === "failed"
                  ) {
                    onStageChange(data.status);
                  }
                }

                // Check for completion indicators
                if (data.log?.includes("completed") || data.log?.includes("Successfully")) {
                  onStageChange("completed");
                }
              } catch (parseError) {
                // If it's not JSON, treat as plain log
                const logLine = line.replace(/^data: /, "");
                if (logLine.trim()) {
                  setLogs((prevLogs) => [...prevLogs, logLine]);
                }
              }
            } else if (line.trim()) {
              // Non-SSE formatted line, add as log
              setLogs((prevLogs) => [...prevLogs, line]);
            }
          }
        }
      } catch (error) {
        console.error("Error processing stream:", error);
        setLogs((prevLogs) => [...prevLogs, `Error: ${error}`]);
        onStageChange("failed");
        // Note: Failed job cleanup will be handled by the Config component
      } finally {
        if (readerRef.current) {
          readerRef.current.releaseLock();
          readerRef.current = null;
        }
      }
    };

    processStream();

    return () => {
      if (readerRef.current) {
        readerRef.current.cancel();
        readerRef.current = null;
      }
    };
  }, [streamResponse, onStageChange, onComplete]);

  return { logs, setLogs };
}
