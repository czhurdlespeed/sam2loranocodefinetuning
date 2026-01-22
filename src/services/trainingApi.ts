import { API_BASE_URL } from "../constants/trainingConfig";

export const trainingApi = {
  async startTraining(
    rank: number,
    checkpoint: string,
    dataset: string,
    epochs: number,
    fullfinetune: boolean,
    sessionToken: string | null,
    signal?: AbortSignal
  ) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(`${API_BASE_URL}/train`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ rank, checkpoint, dataset, epochs, fullfinetune }),
      signal,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }
    // Return the response for streaming - the caller will handle the stream
    return response;
  },

  async getJobs(sessionToken: string | null) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async cancelTraining(userId: string, jobId: string, sessionToken: string | null) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(`${API_BASE_URL}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ userId, jobId }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async downloadCheckpoint(jobId: string, sessionToken: string | null) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    // Only send jobId - userId is derived from session on the server
    const response = await fetch(
      `${API_BASE_URL}/download?jobId=${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  },

  async markJobComplete(jobId: string, status: "completed" | "failed", r2Key?: string, sessionToken: string | null = null) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(`${API_BASE_URL}/jobs/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ jobId, status, r2Key }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }
    return response.json();
  },
};
