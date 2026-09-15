import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Smile,
  Minus,
  ArrowLeft,
  Search,
  MessageSquare,
  FileText,
  Download,
  Loader2,
  ChevronUp,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { chatService, ChatMessage, ConversationInfo } from "@/services/chatService";
import { useNavigate } from "react-router-dom";
import EmojiPicker from "./EmojiPicker";

const DEFAULT_SHOP_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='128' height='128'><rect width='100' height='100' fill='%23FFE4D6' stroke='black' stroke-width='4'/><path d='M20 40 L50 15 L80 40 L80 85 L20 85 Z' fill='white' stroke='black' stroke-width='4'/><rect x='40' y='55' width='20' height='30' fill='%23D97736' stroke='black' stroke-width='4'/><path d='M15 40 L85 40' stroke='black' stroke-width='4'/></svg>";

interface ActiveShop {
  id: number;
  name: string;
  logo: string | null;
  role?: string;
}

const ChatWidget = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Hàm tự động phân tích cú pháp link Markdown [tên](url) để hiển thị thành liên kết bấm được
  const renderMessageBody = (body: string) => {
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(body)) !== null) {
      if (match.index > lastIndex) {
        parts.push(body.substring(lastIndex, match.index));
      }
      const linkText = match[1];
      const linkUrl = match[2];
      
      // Nếu là link sản phẩm trên sàn, dùng react-router navigate chuyển trang không reload
      const localProductPrefix = "http://localhost:5173/products/";
      const isLocalProduct = linkUrl.startsWith(localProductPrefix);

      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target={isLocalProduct ? "_self" : "_blank"}
          rel="noopener noreferrer"
          className="underline font-bold text-blue-500 hover:text-blue-700 hover:underline cursor-pointer break-all"
          onClick={(e) => {
            if (isLocalProduct) {
              e.preventDefault();
              const productId = linkUrl.substring(localProductPrefix.length);
              navigate(`/products/${productId}`);
            }
          }}
        >
          {linkText}
        </a>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < body.length) {
      parts.push(body.substring(lastIndex));
    }

    return parts.length > 0 ? (
      <span className="whitespace-pre-line">{parts}</span>
    ) : (
      <span className="whitespace-pre-line">{body}</span>
    );
  };
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [view, setView] = useState<"list" | "detail">("list"); // Chế độ xem kép: list (danh sách shop) hoặc detail (chat với 1 shop)
  
  const [message, setMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<any[]>([
    {
      id: "ai-initial",
      sender_id: 0,
      body: "Xin chào! Tôi là Trợ Lý AI của UTEShop. Bạn có thắc mắc gì về chính sách đổi trả, phương thức thanh toán hoặc đang tìm kiếm sản phẩm nào không?",
      sent_at: new Date().toISOString()
    }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [activeShop, setActiveShop] = useState<ActiveShop | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevUnreadCountRef = useRef<number>(0);
  const isInitialUnreadLoad = useRef<boolean>(true);
  const messagesLengthRef = useRef<number>(0);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized && view === "detail") {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, view]);

  // 1. Polling lấy tổng số lượng tin nhắn chưa đọc (mỗi 5 giây)
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const res = await chatService.getUnreadCount();
        if (res && res.data !== undefined) {
          if (!isInitialUnreadLoad.current && res.data > prevUnreadCountRef.current) {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav");
            audio.play().catch(e => console.log("Blocked audio play:", e));
          }
          isInitialUnreadLoad.current = false;
          prevUnreadCountRef.current = res.data;
          setUnreadCount(res.data);
        }
      } catch (err) {
        console.error("Lỗi lấy số lượng tin nhắn chưa đọc:", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isOpen]);

  // 2. Polling danh sách các cuộc trò chuyện (mỗi 5 giây khi widget đang mở ở chế độ list)
  useEffect(() => {
    if (!isAuthenticated || !isOpen || isMinimized || (view !== "list" && activeShop)) {
      return;
    }

    const fetchConversations = async () => {
      try {
        const res = await chatService.getConversations();
        if (res && res.data) {
          setConversations(res.data);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách cuộc trò chuyện:", err);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isOpen, isMinimized, view, activeShop]);

  // 3. Lắng nghe sự kiện mở chat trực tiếp từ trang sản phẩm/shop
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { shopId, shopName, shopLogo } = customEvent.detail;
      
      if (!isAuthenticated) {
        navigate("/auth/login");
        return;
      }

      setActiveShop({
        id: Number(shopId),
        name: shopName,
        logo: shopLogo
      });
      setView("detail");
      setIsOpen(true);
      setIsMinimized(false);
    };

    window.addEventListener("openChat", handleOpenChat);
    return () => window.removeEventListener("openChat", handleOpenChat);
  }, [isAuthenticated, navigate]);

  // 4. Polling lấy lịch sử tin nhắn khi đang xem chat chi tiết (mỗi 3 giây)
  useEffect(() => {
    if (!isAuthenticated || !isOpen || isMinimized || view !== "detail" || !activeShop || activeShop.id === 0) {
      return;
    }

    messagesLengthRef.current = 0;

    const fetchChatHistory = async () => {
      try {
        const res = await chatService.getChatHistory(activeShop.id);
        if (res && res.data) {
          if (messagesLengthRef.current > 0 && res.data.length > messagesLengthRef.current) {
            const lastNewMsg = res.data[res.data.length - 1];
            if (lastNewMsg.sender_id !== user?.id) {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav");
              audio.play().catch(e => console.log("Blocked audio play:", e));
            }
          }
          messagesLengthRef.current = res.data.length;
          setMessages(res.data);
        }
      } catch (err) {
        console.error("Lỗi lấy lịch sử chat:", err);
      }
    };

    fetchChatHistory();
    const interval = setInterval(fetchChatHistory, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isOpen, isMinimized, view, activeShop]);

  const handleToggleOpen = async () => {
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }
    
    // Khi người dùng click icon chat chung, tải danh sách cuộc trò chuyện trước
    try {
      const res = await chatService.getConversations();
      if (res && res.data) {
        setConversations(res.data);
        // Nếu đã từng chat với ai đó, tự động mở danh sách cuộc trò chuyện
        setView("list");
      }
    } catch (err) {
      console.error(err);
    }
    
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleSelectConversation = (conv: ConversationInfo) => {
    setActiveShop({
      id: conv.partner.id,
      name: conv.partner.name,
      logo: conv.partner.avatar,
      role: conv.partner.role
    });
    setView("detail");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Dung lượng file vượt quá giới hạn cho phép (${isImage ? "5MB đối với hình ảnh" : "10MB đối với tài liệu"})`);
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const res = await chatService.uploadAttachment(file);
      if (res && res.data) {
        setAttachedFile({
          url: res.data.url,
          name: res.data.name,
          type: res.data.type
        });
      }
    } catch (err) {
      console.error("Lỗi tải tệp lên:", err);
      alert("Tải tệp lên thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleTriggerFileInput = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleRemoveAttachedFile = () => {
    setAttachedFile(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = message.trim();
    if (!content && !attachedFile) return;
    if (!activeShop || !isAuthenticated || isUploading) return;

    if (activeShop.id === 0) {
      setMessage("");
      const userMsg = {
        id: `user-${Date.now()}`,
        sender_id: user?.id,
        body: content,
        sent_at: new Date().toISOString(),
      };
      setAiMessages((prev) => [...prev, userMsg]);
      setIsAiTyping(true);

      try {
        const res = await chatService.chatWithAI(content);
        const aiReply = {
          id: `ai-${Date.now()}`,
          sender_id: 0,
          body: res.reply,
          products: res.products,
          sent_at: new Date().toISOString(),
        };
        setAiMessages((prev) => [...prev, aiReply]);
      } catch (err: any) {
        const errorReply = {
          id: `ai-err-${Date.now()}`,
          sender_id: 0,
          body: "Xin lỗi, tôi gặp lỗi kết nối với máy chủ AI. Vui lòng thử lại sau.",
          sent_at: new Date().toISOString(),
        };
        setAiMessages((prev) => [...prev, errorReply]);
      } finally {
        setIsAiTyping(false);
      }
      return;
    }

    setMessage("");
    const currentAttachment = attachedFile;
    setAttachedFile(null);

    try {
      const res = await chatService.sendMessage(
        activeShop.id,
        content,
        currentAttachment?.url,
        currentAttachment?.name,
        currentAttachment?.type
      );
      if (res && res.data) {
        setMessages((prev) => [...prev, res.data]);
        const unreadRes = await chatService.getUnreadCount();
        if (unreadRes && unreadRes.data !== undefined) {
          setUnreadCount(unreadRes.data);
        }
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      setAttachedFile(currentAttachment);
      setMessage(content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend(e);
    }
  };

  // Lọc các cuộc hội thoại theo thanh tìm kiếm
  const filteredConversations = conversations.filter((conv) =>
    conv.partner.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={handleToggleOpen}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full shadow-premium hover:shadow-glow hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group cursor-pointer"
      >
        <MessageCircle size={28} className="group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5.5 h-5.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white animate-pulse shadow-md">
            {unreadCount}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-8 right-8 w-[380px] bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-premium z-50 overflow-hidden transition-all duration-300 flex flex-col ${isMinimized ? 'h-20' : 'h-[550px]'}`}>
      {/* Header */}
      <div 
        onClick={() => isMinimized && setIsMinimized(false)}
        className={`p-5 border-b border-gray-100 flex items-center justify-between bg-white/80 relative z-10 select-none ${isMinimized ? 'cursor-pointer hover:bg-gray-50/50' : ''}`}
      >
        <div className="flex items-center gap-3">
          {view === "detail" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setView("list");
              }}
              className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all cursor-pointer active:scale-95 animate-in fade-in duration-200"
              title="Quay lại danh sách"
            >
              <ArrowLeft size={14} className="stroke-[2.5px]" />
            </button>
          )}
          
          <div className="relative">
            <div className="w-10 h-10 rounded-full border border-gray-100 bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
              {view === "detail" ? (
                activeShop?.id === 0 ? (
                  <span className="text-lg">🤖</span>
                ) : (
                  <img
                    src={activeShop?.logo || DEFAULT_SHOP_LOGO}
                    alt="Shop"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <MessageSquare size={18} className="text-primary fill-primary/10" />
              )}
            </div>
            {view === "detail" && (
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${activeShop?.id === 0 ? "bg-purple-500" : "bg-green-500"}`}></div>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="text-xs font-bold uppercase tracking-tight truncate max-w-[150px]">
                {view === "detail" ? (activeShop?.name || "Cửa hàng") : "Hộp thư hỗ trợ"}
              </h4>
              {view === "detail" && activeShop?.id === 0 && (
                <span className="bg-purple-600 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm shrink-0">Trợ lý AI</span>
              )}
              {view === "detail" && activeShop?.role?.toUpperCase() === 'MANAGER' && (
                <span className="bg-blue-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm shrink-0">Quản lý</span>
              )}
              {view === "detail" && activeShop?.role?.toUpperCase() === 'ADMIN' && (
                <span className="bg-red-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm shrink-0">Admin</span>
              )}
            </div>
            <p className={`text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 ${activeShop?.id === 0 ? "text-purple-500" : "text-green-500"}`}>
              {view === "detail" ? (activeShop?.id === 0 ? "Sẵn sàng trả lời" : "Đang hoạt động") : "Dữ liệu thực tế"}
            </p>
          </div>
        </div>
        
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg transition-all cursor-pointer active:scale-95"
            title={isMinimized ? "Mở rộng" : "Thu nhỏ"}
          >
            {isMinimized ? (
              <ChevronUp size={16} className="stroke-[2px]" />
            ) : (
              <Minus size={16} className="stroke-[2px]" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer active:scale-95"
            title="Đóng"
          >
            <X size={16} className="stroke-[2px]" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* VIEW 1: Chat List */}
          {view === "list" && (
            <div className="flex-grow flex flex-col h-full overflow-hidden bg-white">
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/10">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm cửa hàng đã chat..."
                    className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-[10px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                </div>
              </div>

              {/* List Conversations */}
              <div className="flex-grow overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                {!searchQuery && (
                  <button
                    onClick={() => {
                      setActiveShop({
                        id: 0,
                        name: "Trợ Lý AI UTEShop",
                        logo: null,
                        role: "AI",
                      });
                      setView("detail");
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-purple-50/50 transition-all text-left cursor-pointer group active:scale-95 border-2 border-dashed border-purple-200"
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full border border-purple-200 bg-purple-100 overflow-hidden flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <span className="text-lg">🤖</span>
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase tracking-tight text-purple-700">
                          Trợ lý AI Thông Minh
                        </span>
                        <span className="bg-purple-600 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm shrink-0">
                          AI Bot
                        </span>
                      </div>
                      <p className="text-[10px] truncate text-gray-500 font-semibold">
                        Hỏi về sản phẩm, chính sách đổi trả...
                      </p>
                    </div>
                  </button>
                )}

                {filteredConversations.length === 0 ? (
                  !searchQuery ? null : (
                    <div className="text-center py-20 flex flex-col items-center justify-center p-6">
                      <MessageSquare size={36} className="text-gray-300 mb-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Không có cuộc trò chuyện nào
                      </span>
                      <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase text-center max-w-[240px] leading-relaxed">
                        Hãy ghé qua gian hàng bất kỳ và bấm nút "Chat ngay" để bắt đầu!
                      </p>
                    </div>
                  )
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all text-left cursor-pointer group active:scale-95"
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full border border-gray-100 bg-primary/10 overflow-hidden flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                          <img
                            src={conv.partner.avatar || DEFAULT_SHOP_LOGO}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[10px] font-bold uppercase tracking-tight group-hover:text-primary transition-colors truncate">
                              {conv.partner.name}
                            </span>
                            {conv.partner.role?.toUpperCase() === 'MANAGER' && (
                              <span className="bg-blue-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm shrink-0">Quản lý</span>
                            )}
                            {conv.partner.role?.toUpperCase() === 'ADMIN' && (
                              <span className="bg-red-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm shrink-0">Admin</span>
                            )}
                          </div>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest shrink-0 pl-2">
                            {conv.lastMessage ? new Date(conv.lastMessage.sent_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center gap-2">
                          <p className={`text-[10px] truncate font-medium ${conv.unreadCount > 0 ? "text-black font-black" : "text-gray-500"}`}>
                            {conv.lastMessage ? conv.lastMessage.body : "Chưa có tin nhắn"}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-red-500 text-white border border-white rounded-full px-1.5 py-0.5 text-[7px] font-bold shrink-0 shadow-sm animate-pulse">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: Chat Detail */}
          {view === "detail" && (
            <>
              {/* Messages Area */}
              <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-[#F9F9F7] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] scrollbar-thin">
                {(() => {
                  const activeMessages = activeShop?.id === 0 ? aiMessages : messages;
                  if (activeMessages.length === 0) {
                    return (
                      <div className="text-center py-12 flex flex-col items-center justify-center">
                        <span className="bg-white border border-gray-100 px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest text-gray-400 shadow-sm">
                          Mở đầu hộp thư
                        </span>
                        <p className="text-[9px] font-bold text-gray-400 mt-3.5 uppercase tracking-wide">
                          Gửi lời chào đầu tiên đến shop!
                        </p>
                      </div>
                    );
                  }
                  return (
                    <>
                      {activeMessages.map((msg, index) => {
                        const isMe = String(msg.sender_id) === String(user?.id);
                        
                        // Nhóm tin nhắn theo ngày
                        const showDateSeparator = index === 0 || 
                          new Date(msg.sent_at).toDateString() !== new Date(activeMessages[index - 1].sent_at).toDateString();
                        
                        return (
                          <React.Fragment key={msg.id}>
                            {showDateSeparator && (
                              <div className="flex justify-center my-3 select-none">
                                <span className="bg-white border border-gray-100 px-3.5 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest text-gray-400 shadow-sm">
                                  {new Date(msg.sent_at).toLocaleDateString("vi-VN", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                  })}
                                </span>
                              </div>
                            )}
                            
                            <div className={`flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-1 duration-200 ${isMe ? "ml-auto flex-row-reverse text-right" : ""}`}>
                              {!isMe && (
                                <div className="w-8 h-8 rounded-full border border-gray-100 bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                                  {activeShop?.id === 0 ? (
                                    <span className="text-xs">🤖</span>
                                  ) : (
                                    <img
                                      src={activeShop?.logo || DEFAULT_SHOP_LOGO}
                                      alt="Shop"
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                              )}
                              {isMe && (
                                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center text-[8px] font-bold shrink-0 uppercase shadow-sm">
                                  {user?.profile?.full_name ? user.profile.full_name.substring(0, 2) : "ME"}
                                </div>
                              )}
                              <div className="space-y-1 max-w-[calc(100%-2.5rem)]">
                                <div className="flex items-center gap-2 mb-0.5">
                                  {!isMe && msg.sender?.role?.role_name?.toUpperCase() === 'MANAGER' && (
                                    <span className="bg-blue-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">Quản lý</span>
                                  )}
                                  {!isMe && msg.sender?.role?.role_name?.toUpperCase() === 'ADMIN' && (
                                    <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">Admin</span>
                                  )}
                                </div>
                                <div className={`p-3.5 rounded-2xl shadow-sm text-left ${isMe ? "bg-primary text-white rounded-tr-none" : "bg-white text-black rounded-tl-none border border-gray-100"}`}>
                                  {msg.attachment_url && (
                                    <div className="mb-2 max-w-full overflow-hidden rounded-xl">
                                      {msg.attachment_type?.startsWith("image/") ? (
                                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                                          <img 
                                            src={msg.attachment_url} 
                                            alt={msg.attachment_name || "Attachment"} 
                                            className="max-w-full max-h-[160px] object-cover rounded-lg"
                                          />
                                        </a>
                                      ) : (
                                        <a 
                                          href={msg.attachment_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-[10px] font-bold transition-all ${isMe ? "bg-primary-dark/30 border-white/20 text-white hover:bg-primary-dark/50" : "bg-gray-50 border-gray-100 text-black hover:bg-gray-100"}`}
                                        >
                                          <FileText size={16} className={isMe ? "text-white/80" : "text-primary"} />
                                          <span className="truncate max-w-[120px]" title={msg.attachment_name || "File"}>
                                            {msg.attachment_name || "Tệp đính kèm"}
                                          </span>
                                          <Download size={14} className="ml-auto opacity-70 shrink-0" />
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {msg.body && (
                                    <p className="text-[11px] font-medium leading-relaxed break-words">
                                      {renderMessageBody(msg.body)}
                                    </p>
                                  )}
                                  {msg.products && msg.products.length > 0 && (
                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin max-w-full">
                                      {msg.products.map((prod: any) => (
                                        <div
                                          key={prod.id}
                                          onClick={() => {
                                            setIsOpen(false); // Close chat widget when navigating to product
                                            navigate(`/products/${prod.slug}`);
                                          }}
                                          className="flex-shrink-0 w-[110px] bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                                        >
                                          <div className="w-full h-[75px] bg-gray-50 overflow-hidden relative">
                                            <img
                                              src={prod.image_url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=300"}
                                              alt={prod.name}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                          </div>
                                          <div className="p-2">
                                            <h5 className="text-[9px] font-black text-gray-800 line-clamp-2 min-h-[24px]">
                                              {prod.name}
                                            </h5>
                                            <p className="text-[9px] font-extrabold text-primary mt-1">
                                              {Number(prod.price).toLocaleString("vi-VN")}đ
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[8px] font-bold text-gray-400 block px-1 select-none">
                                  {new Date(msg.sent_at).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      {isAiTyping && (
                        <div className="flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-1 duration-200">
                          <div className="w-8 h-8 rounded-full border border-purple-100 bg-purple-100 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                            <span className="text-xs">🤖</span>
                          </div>
                          <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  );
                })()}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSend} className="p-5 border-t border-gray-100 bg-white select-none">
                {/* File Upload Preview */}
                {(isUploading || attachedFile) && (
                  <div className="mb-3 p-2 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold py-1">
                        <Loader2 className="animate-spin text-primary" size={14} />
                        <span>Đang tải tệp lên...</span>
                      </div>
                    ) : attachedFile ? (
                      <>
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center bg-white shadow-sm">
                          {attachedFile.type.startsWith("image/") ? (
                            <img src={attachedFile.url} alt="Attached Preview" className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={18} className="text-primary" />
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-[10px] font-black uppercase text-gray-600 truncate">
                            {attachedFile.name}
                          </p>
                          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                            {attachedFile.type.startsWith("image/") ? "Hình ảnh" : "Tài liệu"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveAttachedFile}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95"
                          title="Hủy đính kèm"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : null}
                  </div>
                )}

                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-1.5 pl-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <EmojiPicker
                    onSelectEmoji={(emoji) => setMessage((prev) => prev + emoji)}
                    theme="modern"
                  />
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    disabled={isUploading}
                    className="text-gray-400 hover:text-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 shrink-0"
                    title="Đính kèm tệp"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Nhập tin nhắn..."
                    className="flex-grow bg-transparent border-none focus:outline-none text-[11px] font-bold py-1.5"
                    disabled={!activeShop || isUploading}
                  />
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <button
                    type="submit"
                    className={`p-2 rounded-xl transition-all ${(message.trim() || attachedFile) && !isUploading ? "bg-primary text-white shadow-soft hover:bg-primary-dark cursor-pointer active:scale-95" : "text-gray-300 cursor-not-allowed"}`}
                    disabled={(!message.trim() && !attachedFile) || !activeShop || isUploading}
                  >
                    <Send size={18} />
                  </button>
                </div>
                <div className="flex justify-end mt-2 px-1">
                  <span className="text-[8px] font-bold text-gray-300">Nhấn Enter để gửi</span>
                </div>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWidget;
