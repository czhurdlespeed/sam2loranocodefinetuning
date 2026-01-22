import { API_BASE_URL } from "../constants/trainingConfig";

export const trainingApi = {
  async startTraining(
    rank: number,
    checkpoint: string,
    dataset: string,
    epochs: number,
    sessionToken: string | null
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
      body: JSON.stringify({ rank, checkpoint, dataset, epochs }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async getStatus(userId: string, sessionToken: string | null) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(`${API_BASE_URL}/status/${userId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async cancelTraining(userId: string, sessionToken: string | null) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(`${API_BASE_URL}/cancel/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  },

  async cleanupTraining(userId: string, sessionToken: string | null) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(`${API_BASE_URL}/cleanup/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  },

  async downloadCheckpoint(userId: string, sessionToken: string | null) {
    if (!sessionToken) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(`${API_BASE_URL}/download/${userId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  },
};
