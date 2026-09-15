import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/shared/api/axiosClient";

export interface Conversation {
  id: number;
  partner: {
    type: "user" | "shop";
    id: number;
    name: string;
    avatar: string | null;
    role?: string;
  };
  lastMessage: {
    id: number;
    body: string;
    sent_at: string;
    sender_id: number;
    is_read: boolean;
  } | null;
  unreadCount: number;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  is_read: boolean;
  sent_at: string;
  sender: {
    id: number;
    email: string;
    role?: {
      role_name: string;
    } | null;
  };
}

export const useConversations = () => {
  return useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: async (): Promise<Conversation[]> => {
      const response = await axiosClient.get("/chats/conversations");
      return response.data.data;
    },
  });
};

export const useMessages = (partnerId: number | null) => {
  return useQuery({
    queryKey: ["chat", "messages", partnerId],
    queryFn: async (): Promise<Message[]> => {
      if (!partnerId) return [];
      const response = await axiosClient.get(`/chats/messages/${partnerId}`);
      return response.data.data;
    },
    enabled: !!partnerId,
    refetchInterval: 5000, // auto refresh messages every 5s while chat is open
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: number; content: string }) => {
      const response = await axiosClient.post("/chats/messages", { receiverId, content });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ["chat", "unreadCount"],
    queryFn: async (): Promise<number> => {
      const response = await axiosClient.get("/chats/unread-count");
      return response.data.data;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
};
