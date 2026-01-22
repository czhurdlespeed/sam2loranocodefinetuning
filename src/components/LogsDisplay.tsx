"use client";

import { useEffect, useRef, memo } from "react";

type JobStatus = "pending" | "running" | "completed" | "failed";

interface LogsDisplayProps {
  logs: string[];
  jobStatus: JobStatus;
}

export const LogsDisplay = memo(function LogsDisplay({
  logs,
  jobStatus,
}: LogsDisplayProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const statusColors = {
    completed: "bg-green-500 text-gray-900 dark:text-white",
    failed: "bg-red-600 text-gray-900 dark:text-white",
    pending: "bg-yellow-300 text-gray-900 dark:text-white",
    running: "bg-blue-500 text-gray-900 dark:text-white",
  };

  return (
    <div className="my-8 mx-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-black dark:border-white w-auto max-w-3xl">
      <h3 className="text-gray-900 dark:text-gray-100 mt-0 font-bold mb-4 underline">
        Training Logs
      </h3>
      {jobStatus && (
        <div
          className={`p-2 rounded-md mb-4 font-bold text-gray-900 dark:text-white ${statusColors[jobStatus]}`}
        >
          Status: {jobStatus.charAt(0).toUpperCase() + jobStatus.slice(1)}
        </div>
      )}
      <div className="max-h-96 overflow-y-auto bg-gray-700 dark:bg-gray-100 p-4 rounded-xl">
        {logs.map((log, index) => (
          <div key={index} className="text-orange-500 dark:text-orange-600 font-bold break-words">
            {log}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
});
