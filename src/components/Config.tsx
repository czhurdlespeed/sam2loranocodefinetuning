"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { RANKS, CHECKPOINTS, DATASETS } from "../constants/trainingConfig";
import { trainingApi } from "../services/trainingApi";
import { useTrainingLogs } from "../hooks/useTrainingLogs";
import { useTypingEffect } from "../hooks/useTypingEffect";
import { useCyclingTypingEffect } from "../hooks/useCyclingTypingEffect";
import { ConfigOption } from "./ConfigOption";
import { TrainingControls } from "./TrainingControls";
import { LogsDisplay } from "./LogsDisplay";
import { ConfigSlider } from "./ConfigSlider";
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
  const [error, setError] = useState<string | null>(null);
  const [epochs, setEpochs] = useState(1);
  const hasAutoStartedRef = useRef(false);

  // Determine if we should be listening for logs/status updates
  const isActive =
    stage === "submitting" || stage === "pending" || stage === "running";

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

  const { logs, setLogs } = useTrainingLogs(
    isActive,
    userId,
    handleStageChange,
    session?.session?.token || null
  );

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
    if (!session?.session?.token) {
      setError("Not authenticated");
      return;
    }
    setError(null);
    setStage("submitting");
    setLogs([]);
    const data = await trainingApi.startTraining(
      RANKS[rankIndex],
      CHECKPOINTS[checkpointKey],
      DATASETS[datasetKey],
      epochs,
      session.session.token
    );
    setUserId(data.user_id);

    try {
      const status = await trainingApi.getStatus(
        data.user_id,
        session.session.token
      );
      if (status && status.status) {
        handleStageChange(status.status);
      }
    } catch (statusError) {
      console.error("Error fetching initial status:", statusError);
    }
  }, [
    rankIndex,
    checkpointKey,
    datasetKey,
    epochs,
    handleStageChange,
    session?.session?.token,
    setLogs,
  ]);

  const handleTrain = useCallback(async () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("shouldStartTraining", "true");
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
    try {
      setError(null);
      setStage("cancelling");
      setLogs([]);
      await trainingApi.cancelTraining(userId, session.session.token);
      setStage("idle");
      setUserId(""); // Clear userId to ensure clean state for next job
    } catch (error) {
      setError("Failed to cancel training job");
      setStage("idle");
      setUserId(""); // Clear userId even on error
      console.error("Error canceling training job:", error);
    }
  }, [userId, session?.session?.token, setLogs]);

  const handleDownload = useCallback(async () => {
    if (!session?.session?.token) {
      setError("Not authenticated");
      return;
    }
    try {
      setError(null);
      const blob = await trainingApi.downloadCheckpoint(
        userId,
        session.session.token
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `checkpoint.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      await trainingApi.cleanupTraining(userId, session.session.token);
      setStage("idle");
    } catch (error) {
      setError("Failed to download checkpoint");
      console.error("Error downloading checkpoint:", error);
    }
  }, [userId, session?.session?.token]);

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

  useEffect(() => {
    const shouldStartTraining = sessionStorage.getItem("shouldStartTraining");
    if (
      isAuthenticated &&
      shouldStartTraining &&
      !hasAutoStartedRef.current &&
      stage === "idle"
    ) {
      hasAutoStartedRef.current = true;
      sessionStorage.removeItem("shouldStartTraining");
      submitTraining().catch((error) => {
        setStage("idle");
        setError("Failed to submit training job");
        console.error("Error submitting training job:", error);
        hasAutoStartedRef.current = false;
      });
    }

    if (!shouldStartTraining && hasAutoStartedRef.current) {
      hasAutoStartedRef.current = false;
    }
  }, [isAuthenticated, submitTraining, stage]);

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
