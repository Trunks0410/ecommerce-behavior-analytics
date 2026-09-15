import { axiosClient } from "@/shared/api/axiosClient";

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  getNotifications: async (): Promise<{ data: Notification[] }> => {
    const response = await axiosClient.get("/notifications");
    return response.data;
  },

  markAsRead: async (id: number): Promise<{ data: Notification }> => {
    const response = await axiosClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<any> => {
    const response = await axiosClient.post("/notifications/read-all");
    return response.data;
  }
};
