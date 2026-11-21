import { axiosClient } from "@/shared/api/axiosClient";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  type: string;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationOverviewResponse {
  items: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    unread: number;
    read: number;
    byCategory: {
      order: number;
      return: number;
      social: number;
      shop: number;
      system: number;
    };
  };
}

export const notificationService = {
  getNotifications: async (): Promise<{ data: Notification[] }> => {
    const response = await axiosClient.get("/notifications");
    return response.data;
  },

  getNotificationsOverview: async (params?: {
    page?: number;
    limit?: number;
    status?: "all" | "unread" | "read";
    category?: "all" | "order" | "return" | "social" | "shop" | "system";
    q?: string;
  }): Promise<{ data: NotificationOverviewResponse }> => {
    const response = await axiosClient.get("/notifications/overview", { params });
    return response.data;
  },

  subscribeStream: (
    accessToken: string,
    onNotification: (notif: Notification) => void,
  ): (() => void) => {
    const controller = new AbortController();
    let closed = false;

    const connect = async () => {
      while (!closed && !controller.signal.aborted) {
        try {
          const response = await fetch(`${BASE_URL}/notifications/stream`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "text/event-stream",
            },
            credentials: "include",
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            if (response.status === 401 || response.status === 403) return;
            throw new Error(`SSE status ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!closed) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split("\n\n");
            buffer = events.pop() || "";

            for (const block of events) {
              const lines = block.split("\n");
              let eventName = "message";
              let dataLine = "";
              for (const line of lines) {
                if (line.startsWith("event:")) {
                  eventName = line.slice(6).trim();
                } else if (line.startsWith("data:")) {
                  dataLine += line.slice(5).trim();
                }
              }
              if (eventName === "notification" && dataLine) {
                try {
                  onNotification(JSON.parse(dataLine) as Notification);
                } catch {
                  // Ignore malformed event payload
                }
              }
            }
          }
        } catch (err: any) {
          if (closed || err?.name === "AbortError") return;
          // Backoff before reconnecting if stream drops
          await new Promise((r) => setTimeout(r, 10000));
        }
      }
    };

    connect();

    return () => {
      closed = true;
      controller.abort();
    };
  },

  markAsRead: async (id: number): Promise<{ data: Notification }> => {
    const response = await axiosClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<any> => {
    const response = await axiosClient.post("/notifications/read-all");
    return response.data;
  },

  deleteNotification: async (id: number): Promise<any> => {
    const response = await axiosClient.delete(`/notifications/${id}`);
    return response.data;
  },

  deleteReadNotifications: async (): Promise<{ data: { deletedCount: number } }> => {
    const response = await axiosClient.delete("/notifications/read");
    return response.data;
  },
};
