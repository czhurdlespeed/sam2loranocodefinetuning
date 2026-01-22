"use client";

import { memo } from "react";
import { ClipLoader } from "react-spinners";

type Stage = "idle" | "submitting" | "pending" | "running" | "completed" | "failed" | "cancelling";

interface TrainingControlsProps {
  stage: Stage;
  onTrain: () => void;
  onCancel: () => void;
  onDownload: () => void;
}

export const TrainingControls = memo(function TrainingControls({
  stage,
  onTrain,
  onCancel,
  onDownload,
}: TrainingControlsProps) {
  // Show "Submitting Job" with spinner while submitting
  if (stage === "submitting") {
    return (
      <div className="flex flex-col gap-4 items-center">
        <button
          className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-orange-400 text-gray-900 dark:text-white font-bold text-xl w-[250px] cursor-not-allowed flex items-center justify-center gap-2"
          disabled={true}
        >
          Submitting Job
          <ClipLoader size={16} color="#000000" />
        </button>
      </div>
    );
  } else if (stage == "pending") {
    return (
      <div className="flex flex-col gap-4 items-center lg:flex-row lg:justify-center lg:gap-4">
        <button
          className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-yellow-300 text-gray-900 dark:text-white font-bold text-xl w-[250px] cursor-not-allowed opacity-80 flex items-center justify-center gap-2"
          disabled={true}
        >
          Job Pending
          <ClipLoader size={16} color="#000000" />
        </button>
        <button
          className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-red-600 text-gray-900 dark:text-white font-bold text-xl w-[250px] hover:bg-red-700"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    );
  } else if (stage === "cancelling") {
    return (
      <div className="flex flex-col gap-4 items-center">
        <button
          className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-red-800 text-white font-bold text-xl w-[250px] cursor-not-allowed flex items-center justify-center gap-2"
          disabled={true}
        >
          Canceling
          <ClipLoader size={16} color="#ffffff" />
        </button>
      </div>
    );
  }

  // Show cancel/download buttons for active or completed jobs
  if (stage === "running" || stage === "completed" || stage === "failed") {
    const canCancel = stage === "running";
    const canDownload = stage === "completed";

    return (
      <div className="flex flex-col gap-4 items-center lg:flex-row lg:justify-center lg:gap-4">
        {canCancel && (
          <button
            className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-red-600 text-gray-900 dark:text-white font-bold text-xl w-[250px] hover:bg-red-700"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-yellow-400 text-gray-900 dark:text-white font-bold text-xl w-[250px] disabled:cursor-not-allowed disabled:opacity-80 disabled:bg-gray-400 hover:bg-yellow-300"
          disabled={!canDownload}
          onClick={onDownload}
        >
          Download Checkpoint
        </button>
      </div>
    );
  }

  // Default: show train button (idle state)
  return (
    <div className="flex flex-col gap-4 items-center">
      <button
        className="px-5 py-2.5 rounded-xl border-2 border-black dark:border-white bg-green-500 text-gray-900 dark:text-white font-bold text-xl w-[250px] hover:bg-green-400"
        onClick={onTrain}
      >
        Train
      </button>
    </div>
  );
});
