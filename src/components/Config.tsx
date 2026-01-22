"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { RANKS, CHECKPOINTS, DATASETS } from "../constants/trainingConfig";
import { trainingApi } from "../services/trainingApi";
import { useTrainingLogs } from "../hooks/useTrainingLogs";
import { useTypingEffect } from "../hooks/useTypingEffect";
import { useCyclingTypingEffect } from "../hooks/useCyclingTypingEffect";
import { ConfigOption } from "./ConfigOption";
import { TrainingControls } from "./TrainingControls";
import { LogsDisplay } from "./LogsDisplay";
import { ConfigSlider } from "./ConfigSlider";
import { JobsDropdown } from "./JobsDropdown";
import { useSession } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";

type Stage = "idle" | "submitting" | "pending" | "running" | "completed" | "failed" | "cancelling";

export default function Config() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const isAuthenticated = !!session?.user;
  const [rankIndex, setRankIndex] = useState(0);
  const [checkpointKey, setCheckpointKey] = useState<keyof typeof CHECKPOINTS>("Tiny");
  const [datasetKey, setDatasetKey] = useState<keyof typeof DATASETS>("ir Polymer");
  const [stage, setStage] = useState<Stage>("idle");
  const [userId, setUserId] = useState("");
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [epochs, setEpochs] = useState(1);
  const [streamResponse, setStreamResponse] = useState<Response | null>(null);
  const [userJobs, setUserJobs] = useState<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Callback to update stage when backend status changes
  const handleStageChange = useCallback((newStage: Stage) => {
    setStage((currentStage) => {
      if (
        currentStage === "submitting" ||
        currentStage === "pending" ||
        currentStage === "running" ||
        (currentStage === "idle" && newStage === "submitting")
      ) {
        return newStage;
      }
      return currentStage;
    });
  }, []);

  // Callback to receive jobs from JobsDropdown (to avoid duplicate API calls)
  const handleJobsFetched = useCallback((jobs: any[]) => {
    setUserJobs(jobs || []);
  }, []);

  // Calculate next jobId based on completed jobs count
  const calculateNextJobId = useCallback(() => {
    // Count only completed jobs (since we only store successful jobs)
    const completedJobsCount = userJobs.length;
    return String(completedJobsCount + 1);
  }, [userJobs]);

  const handleStreamComplete = useCallback(async (status: "completed" | "failed") => {
    if (!session?.session?.token || !jobId) {
      return;
    }
    try {
      await trainingApi.markJobComplete(jobId, status, undefined, session.session.token);
      // Dispatch event to notify JobsDropdown to refresh (which will update our userJobs via callback)
      if (status === "completed") {
        window.dispatchEvent(new CustomEvent("jobCompleted"));
      }
    } catch (error) {
      console.error("Error marking job complete/failed:", error);
    }
  }, [jobId, session?.session?.token]);

  const { logs, setLogs } = useTrainingLogs(streamResponse, handleStageChange, handleStreamComplete);

  const handleRankChange = useCallback(() => {
    setRankIndex((prev) => (prev >= RANKS.length - 1 ? 0 : prev + 1));
  }, []);

  const handleCheckpointChange = useCallback(() => {
    const keys = Object.keys(CHECKPOINTS) as Array<keyof typeof CHECKPOINTS>;
    setCheckpointKey((prev) => {
      const currentIndex = keys.indexOf(prev);
      return keys[(currentIndex + 1) % keys.length];
    });
  }, []);

  const handleDatasetChange = useCallback(() => {
    const keys = Object.keys(DATASETS) as Array<keyof typeof DATASETS>;
    setDatasetKey((prev) => {
      const currentIndex = keys.indexOf(prev);
      return keys[(currentIndex + 1) % keys.length];
    });
  }, []);

  // Core training submission logic (extracted for reuse)
  const submitTraining = useCallback(async () => {
    if (!session?.session?.token || !session?.user?.id) {
      setError("Not authenticated");
      return;
    }

    // Check if user is authorized (exists in database)
    // This check happens server-side in the API route, but we can also check here
    if (!isAuthenticated) {
      setError("User not authorized to train models");
      return;
    }

    // Calculate next jobId immediately based on completed jobs
    const nextJobId = calculateNextJobId();

    setError(null);
    setStage("pending"); // Set to pending immediately so cancel button appears
    setLogs([]);
    setUserId(session.user.id);
    setJobId(nextJobId); // Set jobId immediately so cancel works right away

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await trainingApi.startTraining(
        RANKS[rankIndex],
        CHECKPOINTS[checkpointKey],
        DATASETS[datasetKey],
        epochs,
        false, // fullfinetune - can be made configurable later
        session.session.token,
        abortController.signal
      );

      // Verify jobId from response headers matches our calculation
      const responseJobId = response.headers.get("X-Job-Id");
      if (responseJobId && responseJobId !== nextJobId) {
        console.warn(`JobId mismatch: calculated ${nextJobId}, received ${responseJobId}. Using received value.`);
        setJobId(responseJobId);
      }

      // Set the streaming response for useTrainingLogs
      setStreamResponse(response);
      // Stage will be updated to "running" by useTrainingLogs when stream starts
    } catch (error: any) {
      // Don't show error if request was aborted (user canceled)
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        console.log("Training request was canceled");
        setStage("idle");
        setJobId("");
        setUserId("");
        return;
      }
      console.error("Error starting training:", error);
      setError(error.message || "Failed to start training");
      setStage("failed");
      setStreamResponse(null);
      setJobId(""); // Clear jobId on error
    } finally {
      // Clear abort controller reference if request completed
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [
    rankIndex,
    checkpointKey,
    datasetKey,
    epochs,
    session?.session?.token,
    session?.user?.id,
    isAuthenticated,
    setLogs,
    calculateNextJobId,
  ]);

  const handleTrain = useCallback(async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    try {
      await submitTraining();
    } catch (error) {
      setStage("idle");
      setError("Failed to submit training job");
      console.error("Error submitting training job:", error);
    }
  }, [isAuthenticated, router, submitTraining]);

  const handleCancel = useCallback(async () => {
    if (!session?.session?.token) {
      setError("Not authenticated");
      return;
    }
    
    // Abort any ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // jobId should be available from response headers
    // Since jobs are only created when they complete, we can't look them up in the database
    const cancelJobId = jobId;
    const cancelUserId = userId || session.user.id;
    
    if (!cancelJobId || !cancelUserId) {
      // If no jobId, just reset state (request might not have started yet)
      setStage("idle");
      setUserId("");
      setJobId("");
      setStreamResponse(null);
      setLogs([]);
      return;
    }
    
    try {
      setError(null);
      setStage("cancelling");
      setLogs([]);
      await trainingApi.cancelTraining(cancelUserId, cancelJobId, session.session.token);
      setStage("idle");
      setUserId("");
      setJobId("");
      setStreamResponse(null);
    } catch (error) {
      // Even if cancel API call fails, reset the UI state
      setError("Failed to cancel training job");
      setStage("idle");
      setUserId("");
      setJobId("");
      setStreamResponse(null);
      console.error("Error canceling training job:", error);
    }
  }, [userId, jobId, session?.session?.token, session?.user?.id, setLogs]);

  const handleDownload = useCallback(() => {
    if (!session?.session?.token || !userId || !jobId) {
      setError("Not authenticated or missing job information");
      return;
    }
    setError(null);
    const url = trainingApi.getDownloadUrl(jobId);
    const a = document.createElement("a");
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setStage("idle");
  }, [userId, jobId, session?.session?.token]);

  const handleEpochsChange = useCallback((event: any, newValue: number | number[]) => {
    const numValue = Array.isArray(newValue) ? newValue[0] : newValue;
    let clampedValue: number;
    if (numValue <= 1) {
      clampedValue = 1;
    } else if (numValue < 10) {
      clampedValue = 1;
    } else {
      clampedValue = Math.round(numValue / 10) * 10;
    }
    setEpochs(clampedValue);
  }, []);


  // Jobs will be fetched by JobsDropdown and passed via handleJobsFetched callback
  // No need to fetch here to avoid duplicate API calls

  const isConfigDisabled = stage !== "idle" && stage !== "failed";

  // Phrases for the h1 typing effect - memoized to prevent re-creation on every render
  const titlePhrases = useMemo(
    () => [
      "SAM2 LoRA Fine-Tuning",
      "No Code VOS Fine-Tuning",
      "Fine-Tune Your Model Below",
    ],
    []
  );

  // Typing effects - both start simultaneously
  const { displayedText: titleText } = useCyclingTypingEffect(titlePhrases);
  const { displayedText: descriptionText } = useTypingEffect(
    "This tool enables you to fine-tune SAM2 using LoRA. Select your configuration below by clicking the buttons. When ready to train, click train."
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {error && (
        <div className="bg-red-600 text-white p-4 mb-4 rounded-lg text-center">
          {error}
        </div>
      )}
      <h1 className="text-2xl lg:text-4xl text-center w-full mx-auto my-4">
        <span className="text-2xl lg:text-4xl">
          <span className="invisible" aria-hidden="true">
            "i"
          </span>
          <span id="title-text" className="typing-text-visible">
            {titleText}
          </span>
          <span className="invisible" aria-hidden="true">
            "i"
          </span>
        </span>
      </h1>
      <p id="description-text" className="typing-text-visible text-base lg:text-xl text-center my-4">
        {descriptionText}
      </p>

      {isAuthenticated && <JobsDropdown onJobsFetched={handleJobsFetched} />}

      <ul className="list-none p-0 flex flex-col gap-8 justify-center w-full my-4 mb-16 lg:flex-row lg:flex-wrap lg:justify-around">
        <ConfigOption
          label="Rank"
          value={RANKS[rankIndex]}
          onChange={handleRankChange}
          disabled={isConfigDisabled}
        />
        <ConfigOption
          label="Base Checkpoint"
          value={checkpointKey}
          onChange={handleCheckpointChange}
          disabled={isConfigDisabled}
        />
        <ConfigOption
          label="Dataset"
          value={datasetKey}
          onChange={handleDatasetChange}
          disabled={isConfigDisabled}
        />
        <ConfigSlider
          label="Training Epochs"
          value={epochs}
          onChange={handleEpochsChange}
          disabled={isConfigDisabled}
        />
      </ul>

      <TrainingControls
        stage={stage}
        onTrain={handleTrain}
        onCancel={handleCancel}
        onDownload={handleDownload}
      />

      {(stage === "pending" ||
        stage === "running" ||
        stage === "completed" ||
        stage === "failed") && <LogsDisplay logs={logs} jobStatus={stage} />}
    </div>
  );
}
