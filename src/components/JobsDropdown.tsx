"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { trainingApi } from "../services/trainingApi";
import { useSession } from "@/src/lib/auth-client";
import ClipLoader from "react-spinners/ClipLoader";

interface Job {
  id: string;
  userId: string;
  jobId: string;
  r2Key: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface JobsDropdownProps {
  onJobsFetched?: (jobs: Job[]) => void;
}

export function JobsDropdown({ onJobsFetched }: JobsDropdownProps) {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const hasFetchedRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchJobs = useCallback(async () => {
    if (!session?.session?.token) return;
    
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    // Skip if we've already fetched for this token
    if (hasFetchedRef.current === session.session.token) {
      return;
    }

    isFetchingRef.current = true;
    hasFetchedRef.current = session.session.token;
    setLoading(true);
    setError(null);
    try {
      const data = await trainingApi.getJobs(session.session.token);
      const jobsList = data.jobs || [];
      setJobs(jobsList);
      // Notify parent component of fetched jobs
      if (onJobsFetched) {
        onJobsFetched(jobsList);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch jobs");
      console.error("Error fetching jobs:", err);
      // Reset fetch flag on error so we can retry
      hasFetchedRef.current = null;
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [session?.session?.token, onJobsFetched]);

  // Fetch jobs on mount and when session token changes (only once per token)
  useEffect(() => {
    if (!session?.session?.token) {
      hasFetchedRef.current = null;
      return;
    }
    
    fetchJobs();
  }, [session?.session?.token, fetchJobs]);

  // Listen for job completion events to refresh the list
  useEffect(() => {
    const handleJobComplete = () => {
      if (session?.session?.token) {
        hasFetchedRef.current = null; // Reset flag to allow refresh
        fetchJobs();
      }
    };

    window.addEventListener("jobCompleted", handleJobComplete);
    return () => {
      window.removeEventListener("jobCompleted", handleJobComplete);
    };
  }, [session?.session?.token, fetchJobs]);

  const handleDownload = useCallback(
    (job: Job) => {
      if (!session?.session?.token || job.status !== "completed") {
        return;
      }

      setDownloading(job.id);
      setError(null);

      const url = trainingApi.getDownloadUrl(job.jobId);
      const a = document.createElement("a");
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloading(null);
    },
    [session?.session?.token]
  );

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "running":
        return "text-blue-600 dark:text-blue-400";
      case "pending":
        return "text-yellow-600 dark:text-yellow-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      case "cancelled":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  if (!session?.user) {
    return null;
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Your Training Jobs
        </h3>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <ClipLoader size={20} color="#000000" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Loading jobs...
            </span>
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">
            No jobs yet. Start a training job to see it here.
          </p>
        ) : (
          <>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
            >
              <option value="">Select a job...</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  Job #{job.jobId} - {job.status} ({formatDate(job.createdAt)})
                </option>
              ))}
            </select>

            {selectedJob && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span className={`font-semibold ${getStatusColor(selectedJob.status)}`}>
                      {selectedJob.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Created:
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {formatDate(selectedJob.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Updated:
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {formatDate(selectedJob.updatedAt)}
                    </span>
                  </div>
                  {selectedJob.status === "completed" && (
                    <button
                      onClick={() => handleDownload(selectedJob)}
                      disabled={downloading === selectedJob.id}
                      className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors flex items-center justify-center"
                    >
                      {downloading === selectedJob.id ? (
                        <>
                          <ClipLoader size={16} color="#ffffff" />
                          <span className="ml-2">Downloading...</span>
                        </>
                      ) : (
                        "Download Checkpoint"
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
