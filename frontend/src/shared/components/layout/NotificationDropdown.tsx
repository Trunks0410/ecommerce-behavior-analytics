import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  ShoppingBag,
  Wallet,
  Star,
  FileText,
  Check,
  X,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import {
  notificationService,
  Notification,
} from "@/services/notificationService";
import { useLanguage } from "@/shared/context/LanguageContext";

interface NotificationDropdownProps {
  variant?: "header" | "button";
}

export const NotificationDropdown = ({
  variant = "header",
}: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef<number>(0);
  const isInitialLoad = useRef<boolean>(true);
  const { language } = useLanguage();

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res && res.data) {
        const newUnreadCount = res.data.filter(
          (n: Notification) => !n.is_read
        ).length;
        if (
          !isInitialLoad.current &&
          newUnreadCount > prevUnreadCountRef.current
        ) {
          const audio = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav"
          );
          audio
            .play()
            .catch((e) => console.log("Audio play blocked by browser:", e));
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
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
          <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <ShoppingBag size={17} />
          </div>
        );
      case "PAYOUT_STATUS":
        return (
          <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Wallet size={17} />
          </div>
        );
      case "SHOP_STATUS":
        return (
          <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <CheckCircle2 size={17} />
          </div>
        );
      case "NEW_COMMENT":
        return (
          <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-500 shrink-0">
            <Star size={17} className="fill-amber-400 text-amber-400" />
          </div>
        );
      case "NEW_MESSAGE":
        return (
          <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <MessageSquare size={17} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-[#ee4d2d] shrink-0">
            <FileText size={17} />
          </div>
        );
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === "header" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 hover:text-[#ee4d2d] transition-colors py-1 cursor-pointer font-medium text-[12px] relative"
        >
          <div className="relative">
            <Bell size={13} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-[#ee4d2d] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span>{language === "vi" ? "Thông Báo" : "Notifications"}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-[#ee4d2d] text-gray-700 dark:text-slate-200 hover:text-[#ee4d2d] rounded-sm transition-all shadow-xs cursor-pointer"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#ee4d2d] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Shopee-style Notification Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full pt-2 w-[380px] z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Invisible Hover Bridge (Vùng cầu nối hình chữ nhật chống tắt nhầm khi rê chuột) */}
          <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent" />
          {/* Shopee Caret Arrow */}
          <div className="absolute top-0.5 right-6 w-3 h-3 bg-white dark:bg-slate-800 border-t border-l border-black/[0.09] dark:border-slate-700 rotate-45 z-10" />

          {/* Popover Card */}
          <div className="relative bg-white dark:bg-slate-800 border border-black/[0.09] dark:border-slate-700 rounded-xs sm:rounded-sm shadow-[0_2px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/80 bg-white dark:bg-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                {language === "vi"
                  ? "Thông Báo Mới Nhận"
                  : "Recent Notifications"}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-medium text-[#ee4d2d] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Check size={12} />
                  <span>
                    {language === "vi" ? "Đánh dấu đã đọc" : "Mark all as read"}
                  </span>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-100 dark:border-slate-700/80 bg-gray-50/60 dark:bg-slate-900/40 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`flex-1 py-2 font-medium transition-colors cursor-pointer border-b-2 ${
                  filter === "all"
                    ? "text-[#ee4d2d] border-[#ee4d2d] bg-white dark:bg-slate-800"
                    : "text-gray-600 dark:text-slate-400 border-transparent hover:text-gray-900"
                }`}
              >
                {language === "vi" ? "Tất cả" : "All"} ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`flex-1 py-2 font-medium transition-colors cursor-pointer border-b-2 ${
                  filter === "unread"
                    ? "text-[#ee4d2d] border-[#ee4d2d] bg-white dark:bg-slate-800"
                    : "text-gray-600 dark:text-slate-400 border-transparent hover:text-gray-900"
                }`}
              >
                {language === "vi" ? "Chưa đọc" : "Unread"} ({unreadCount})
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/60">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                    <Bell size={20} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {language === "vi"
                      ? "Chưa có thông báo nào"
                      : "No notifications yet"}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`p-3.5 flex gap-3 transition-colors cursor-pointer text-left ${
                      notif.is_read
                        ? "bg-white dark:bg-slate-800 hover:bg-[#fafafa] dark:hover:bg-slate-700/50"
                        : "bg-[#fef0ed]/50 dark:bg-slate-700/40 hover:bg-[#fde6e0]/60 dark:hover:bg-slate-700/60"
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate">
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#ee4d2d] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.content}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1.5">
                        {new Date(notif.created_at).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer: View All Link */}
            <div className="border-t border-gray-100 dark:border-slate-700/80 bg-[#fbfbfb] dark:bg-slate-800 p-2 text-center">
              <Link
                to="/profile?tab=notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-gray-700 dark:text-slate-300 hover:text-[#ee4d2d] dark:hover:text-[#ee4d2d] inline-flex items-center gap-1 transition-colors py-1 px-3"
              >
                <span>
                  {language === "vi" ? "Xem tất cả" : "View all notifications"}
                </span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Chi tiết Thông báo */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xs sm:rounded-sm max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 text-left">
            <button
              type="button"
              onClick={() => setSelectedNotif(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-sm transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex gap-3.5 items-start mb-4">
              {getNotificationIcon(selectedNotif.type)}
              <div className="pr-6">
                <span className="text-[10px] font-semibold text-[#ee4d2d] uppercase tracking-wider bg-[#fef0ed] dark:bg-[#ee4d2d]/20 px-2 py-0.5 rounded-xs">
                  {selectedNotif.type}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mt-2 leading-snug">
                  {selectedNotif.title}
                </h3>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-slate-700/80 py-4">
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedNotif.content}
              </p>
            </div>

            <div className="border-t border-gray-100 dark:border-slate-700/80 pt-3 flex justify-between items-center text-[11px] text-gray-400">
              <span>{language === "vi" ? "Thời gian gửi:" : "Time:"}</span>
              <span className="font-medium text-gray-700 dark:text-slate-300">
                {new Date(selectedNotif.created_at).toLocaleString("vi-VN")}
              </span>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-700/80 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-5 py-2 text-xs font-semibold rounded-xs bg-[#ee4d2d] hover:bg-[#d03e1e] text-white transition-colors cursor-pointer"
              >
                {language === "vi" ? "Đóng" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
