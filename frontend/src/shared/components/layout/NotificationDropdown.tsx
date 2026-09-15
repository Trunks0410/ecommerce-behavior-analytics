import { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, ShoppingBag, Wallet, Star, FileText, Check, X, MessageSquare } from "lucide-react";
import { notificationService, Notification } from "@/services/notificationService";

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef<number>(0);
  const isInitialLoad = useRef<boolean>(true);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res && res.data) {
        const newUnreadCount = res.data.filter((n: Notification) => !n.is_read).length;
        if (!isInitialLoad.current && newUnreadCount > prevUnreadCountRef.current) {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav");
          audio.play().catch((e) => console.log("Audio play blocked by browser:", e));
        }
        isInitialLoad.current = false;
        prevUnreadCountRef.current = newUnreadCount;
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Realtime polling
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      // Cập nhật state cục bộ để tăng trải nghiệm người dùng ngay lập tức
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleNotifClick = async (notif: Notification) => {
    setSelectedNotif(notif);
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "NEW_ORDER":
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-600 shrink-0">
            <ShoppingBag size={16} />
          </div>
        );
      case "PAYOUT_STATUS":
        return (
          <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-300 flex items-center justify-center text-green-600 shrink-0">
            <Wallet size={16} />
          </div>
        );
      case "SHOP_STATUS":
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-600 shrink-0">
            <CheckCircle2 size={16} />
          </div>
        );
      case "NEW_COMMENT":
        return (
          <div className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-300 flex items-center justify-center text-yellow-600 shrink-0">
            <Star size={16} className="fill-yellow-500 text-yellow-500" />
          </div>
        );
      case "NEW_MESSAGE":
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-600 shrink-0">
            <MessageSquare size={16} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 shrink-0">
            <FileText size={16} />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-11 h-11 bg-white border border-gray-100 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-soft hover:-translate-y-1 active:scale-95 text-gray-700"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-500 border-2 border-white text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-96 bg-white border border-gray-100 rounded-2xl shadow-premium z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
            <h3 className="font-serif text-base font-black uppercase tracking-tight">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
              >
                <Check size={12} strokeWidth={3} /> Đánh dấu tất cả
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/30 p-2 gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                filter === "all"
                  ? "bg-black text-white shadow-sm"
                  : "hover:bg-black/5 text-gray-500 hover:text-black"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                filter === "unread"
                  ? "bg-black text-white shadow-sm"
                  : "hover:bg-black/5 text-gray-500 hover:text-black"
              }`}
            >
              Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-black/5 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                Không có thông báo nào
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`p-4 flex gap-3 transition-colors cursor-pointer ${
                    notif.is_read
                      ? "bg-white hover:bg-gray-50"
                      : "bg-blue-50/50 hover:bg-blue-50 border-l-4 border-primary"
                  }`}
                >
                  {getNotificationIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase leading-tight truncate">
                      {notif.title}
                    </p>
                    <p className="text-[11px] font-medium text-gray-600 mt-1 leading-relaxed">
                      {notif.content}
                    </p>
                    <p className="text-[9px] font-bold text-gray-400 mt-2">
                      {new Date(notif.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2.5 h-2.5 bg-primary border border-black rounded-full shrink-0 self-center"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Popup Chi tiết Thông báo */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-white/20 rounded-[2rem] max-w-lg w-full p-8 shadow-premium relative animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setSelectedNotif(null)}
              className="absolute top-6 right-6 p-2 border border-gray-200 rounded-full hover:bg-gray-50 hover:text-red-500 transition-all active:translate-y-0.5 text-gray-500"
            >
              <X size={18} strokeWidth={3} />
            </button>
            <div className="flex gap-4 items-start mb-6">
              {getNotificationIcon(selectedNotif.type)}
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
                  {selectedNotif.type}
                </span>
                <h2 className="text-xl font-serif font-black uppercase tracking-tight mt-3 text-black leading-tight">
                  {selectedNotif.title}
                </h2>
              </div>
            </div>
            
            <div className="border-t border-gray-100 py-6">
              <p className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedNotif.content}
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-[11px] font-black text-gray-400 uppercase tracking-wider">
              <span>Thời gian gửi:</span>
              <span className="text-black">
                {new Date(selectedNotif.created_at).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>

            <button
              onClick={() => setSelectedNotif(null)}
              className="w-full btn-modern py-4 text-xs tracking-widest mt-8"
            >
              Đóng thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
