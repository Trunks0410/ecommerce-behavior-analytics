import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, MessageSquare, ShieldCheck, User } from 'lucide-react';
import { useVendors } from '@/hooks/useManager';
import { useMessages, useSendMessage, useConversations } from '@/hooks/useChat';
import useAuth from '@/hooks/useAuth';

export const ManagerChatTab = () => {
  const { user: currentUser } = useAuth();
  const { data: vendors, isLoading: isVendorsLoading } = useVendors();
  const { data: conversations, isLoading: isConversationsLoading } = useConversations();
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: isMessagesLoading } = useMessages(activePartnerId);
  const sendMessageMutation = useSendMessage();

  const activePartner = vendors?.find((v: any) => v.id === activePartnerId);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activePartnerId) return;

    sendMessageMutation.mutate({ receiverId: activePartnerId, content: messageText }, {
      onSuccess: () => {
        setMessageText('');
      }
    });
  };

  // Build the list of contacts (merge vendors and recent conversations if needed, but since vendors is small, we just filter vendors)
  // To make it better, we can sort vendors who have a recent conversation to the top
  const contactList = (vendors || []).filter((v: any) => 
    v.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.vendor?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a: any, b: any) => {
    const convA = conversations?.find((c) => c.partner.id === a.id);
    const convB = conversations?.find((c) => c.partner.id === b.id);
    const timeA = convA?.lastMessage ? new Date(convA.lastMessage.sent_at).getTime() : 0;
    const timeB = convB?.lastMessage ? new Date(convB.lastMessage.sent_at).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="bg-white rounded-3xl border-4 border-black shadow-brutal overflow-hidden flex h-[calc(100vh-12rem)] min-h-[600px]">
      {/* Left Sidebar: Contacts */}
      <div className="w-1/3 border-r-4 border-black flex flex-col bg-gray-50">
        <div className="p-4 border-b-4 border-black bg-white">
          <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            <MessageSquare size={24} /> Tin nhắn
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm Shop/Vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-2 border-transparent focus:border-black rounded-xl font-bold text-sm transition-all outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isVendorsLoading ? (
            <div className="p-8 text-center text-gray-500 font-bold animate-pulse">Đang tải...</div>
          ) : contactList.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-bold">Không tìm thấy kết quả</div>
          ) : (
            contactList.map((vendor: any) => {
              const conv = conversations?.find((c) => c.partner.id === vendor.id);
              const hasUnread = conv && conv.unreadCount > 0;
              const isActive = activePartnerId === vendor.id;

              return (
                <button
                  key={vendor.id}
                  onClick={() => setActivePartnerId(vendor.id)}
                  className={`w-full p-4 flex items-center gap-3 border-b-2 border-black/5 hover:bg-black/5 transition-colors text-left ${isActive ? 'bg-black/10' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-black flex items-center justify-center font-black text-xl flex-shrink-0 overflow-hidden">
                    {vendor.shop_logo ? (
                      <img src={vendor.shop_logo} alt={vendor.shop_name} className="w-full h-full object-cover" />
                    ) : (
                      vendor.shop_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-sm truncate pr-2">{vendor.shop_name}</h3>
                      {conv?.lastMessage && (
                        <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                          {new Date(conv.lastMessage.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className={`text-xs truncate ${hasUnread ? 'font-black text-black' : 'text-gray-500 font-semibold'}`}>
                        {conv?.lastMessage ? conv.lastMessage.body : "Chưa có tin nhắn"}
                      </p>
                      {hasUnread && (
                        <span className="w-5 h-5 bg-red-500 rounded-full border border-black flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        {activePartnerId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b-4 border-black bg-gray-50 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black">
                {activePartner?.shop_name.charAt(0).toUpperCase()}
               </div>
               <div>
                 <h2 className="font-black text-lg">{activePartner?.shop_name}</h2>
                 <p className="text-xs font-bold text-gray-500">{activePartner?.vendor?.email}</p>
               </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {isMessagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="font-black text-gray-400 animate-pulse">Đang tải tin nhắn...</div>
                </div>
              ) : messages?.length === 0 ? (
                <div className="flex items-center justify-center h-full flex-col gap-2">
                  <MessageSquare size={48} className="text-gray-200" />
                  <p className="font-black text-gray-400">Chưa có tin nhắn nào</p>
                  <p className="text-xs font-bold text-gray-400">Hãy là người đầu tiên gửi tin nhắn</p>
                </div>
              ) : (
                messages?.map((msg: any) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const senderRole = msg.sender?.role?.role_name?.toUpperCase() || 'USER';
                  const isStaff = senderRole === 'MANAGER' || senderRole === 'ADMIN';

                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                         <div className="flex items-center gap-2 mb-1 pl-1">
                           <span className="text-[10px] font-black text-gray-500 uppercase">{activePartner?.shop_name}</span>
                         </div>
                      )}
                      {isMe && (
                         <div className="flex items-center gap-2 mb-1 pr-1">
                           {isStaff && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-black tracking-wider">
                                <ShieldCheck size={10} /> {senderRole}
                              </span>
                           )}
                           <span className="text-[10px] font-black text-gray-500 uppercase">Bạn</span>
                         </div>
                      )}
                      
                      <div 
                        className={`max-w-[70%] p-3 rounded-2xl border-2 border-black font-semibold text-sm ${
                          isMe 
                            ? 'bg-[#E1F396] rounded-tr-none' 
                            : 'bg-white rounded-tl-none'
                        }`}
                      >
                        {msg.body}
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 mt-1">
                        {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t-4 border-black bg-gray-50 flex gap-2">
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border-2 border-black rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-black/5"
              />
              <button 
                type="submit"
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                className="px-6 py-3 bg-black text-white rounded-xl border-2 border-black font-black uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {sendMessageMutation.isPending ? 'Đang gửi...' : <Send size={20} />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={64} className="mb-4 opacity-50" />
            <h2 className="text-xl font-black uppercase mb-2">Chưa chọn đoạn chat</h2>
            <p className="font-semibold text-sm">Chọn một cửa hàng từ danh sách bên trái để bắt đầu nhắn tin</p>
          </div>
        )}
      </div>
    </div>
  );
};
