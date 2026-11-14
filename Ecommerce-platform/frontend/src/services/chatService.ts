import { axiosClient } from "@/shared/api/axiosClient";

export interface ChatPartner {
  type: "shop" | "user";
  id: number;
  name: string;
  avatar: string | null;
  role?: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string | null;
  is_read: boolean;
  sent_at: string;

  sender?: {
    role?: {
      role_name: string;
    };
  };

  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;

}

export interface ConversationInfo {
  id: number;
  partner: ChatPartner;
  lastMessage: {
    id: number;
    body: string | null;
    sent_at: string;
    sender_id: number;
    is_read: boolean;
  } | null;
  unreadCount: number;
  updated_at: string;
}

export const chatService = {
  // Lấy tổng số lượng tin nhắn chưa đọc
  getUnreadCount: async () => {
    const response = await axiosClient.get("/chats/unread-count");
    return response.data;
  },

  // Lấy lịch sử tin nhắn với đối tác (partnerId)
  getChatHistory: async (partnerId: number | string) => {
    const response = await axiosClient.get(`/chats/messages/${partnerId}`);
    return response.data;
  },

  // Gửi tin nhắn đến đối tác (receiverId)
  sendMessage: async (
    receiverId: number | string,
    content: string,
    attachmentUrl?: string | null,
    attachmentName?: string | null,
    attachmentType?: string | null
  ) => {
    const response = await axiosClient.post("/chats/messages", {
      receiverId,
      content,
      attachmentUrl,
      attachmentName,
      attachmentType
    });
    return response.data;
  },

  // Tải tệp đính kèm lên server (Cloudinary)
  uploadAttachment: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosClient.post("/chats/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Lấy danh sách cuộc trò chuyện của người dùng hiện tại
  getConversations: async () => {
    const response = await axiosClient.get("/chats/conversations");
    return response.data;
  },

  // Trò chuyện với trợ lý AI
  chatWithAI: async (message: string) => {
    const response = await axiosClient.post("/chat/ai", { message });
    return response.data;
  }
};
