import { io, Socket } from "socket.io-client";
import type { BackendIncident, BackendWeight, DashboardMetrics } from "@/types/autoflow";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

let cachedToken: string | null = null;

export const api = {
  getAuthToken: async (): Promise<string> => {
    if (cachedToken) return cachedToken;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/token`);
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          cachedToken = data.token;
          return cachedToken as string;
        }
      }
    } catch (e) {
      console.warn("Could not fetch token from /auth/token:", e);
    }
    return (import.meta.env.VITE_OPERATOR_TOKEN as string) || "";
  },

  getIncidents: async (): Promise<BackendIncident[]> => {
    const response = await fetch(`${API_BASE_URL}/incidents`);
    if (!response.ok) throw new Error("Failed to fetch incidents");
    return response.json();
  },

  getMetrics: async (): Promise<DashboardMetrics> => {
    const response = await fetch(`${API_BASE_URL}/metrics`);
    if (!response.ok) throw new Error("Failed to fetch metrics");
    return response.json();
  },

  getWeights: async (): Promise<BackendWeight[]> => {
    const response = await fetch(`${API_BASE_URL}/weights`);
    if (!response.ok) throw new Error("Failed to fetch weights");
    return response.json();
  },

  triggerSimulation: async (type: string = "cpu"): Promise<any> => {
    const token = await api.getAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/simulate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type }),
    });
    if (!response.ok) throw new Error("Failed to trigger simulation");
    return response.json();
  },
};

class WebSocketManager {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return this.socket;
    }

    this.socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      console.log("✓ WebSocket connected to", API_BASE_URL, "| id:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("✗ WebSocket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    const s = this.connect();
    s.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const wsManager = new WebSocketManager();