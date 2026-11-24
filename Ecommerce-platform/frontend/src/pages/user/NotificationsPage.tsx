import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  notificationService,
  type Notification,
  type NotificationOverviewResponse,
} from "@/services/notificationService";
import { useAppSelector } from "@/app/stores/hooks";
import { useLanguage } from "@/shared/context/LanguageContext";
import {
  getNotificationCategory,
  getNotificationCategoryLabel,
  resolveNotificationTarget,
  formatNotificationText,
  type NotificationCategory,
} from "@/shared/utils/notificationUtils";

const EMPTY_SUMMARY: NotificationOverviewResponse["summary"] = {
  total: 0,
  unread: 0,
  read: 0,
  byCategory: {
    order: 0,
    return: 0,
    social: 0,
    shop: 0,
    system: 0,
  },
};

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const userRole = useAppSelector((state) => state.auth.user?.role);

  const [items, setItems] = useState<Notification[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | NotificationCategory>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotificationsOverview({
        page,
        limit: 10,
        status: statusFilter,
        category: categoryFilter,
        q: searchQuery || undefined,
      });
      if (res?.data) {
        setItems(res.data.items || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
        setSummary(res.data.summary || EMPTY_SUMMARY);
      }
    } catch (err) {
      console.error("Failed to fetch notifications overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [page, statusFilter, categoryFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleMarkAsRead = async (notif: Notification) => {
    if (notif.is_read) return;
    try {
      await notificationService.markAsRead(notif.id);
      setItems((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setSummary((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1,
      }));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await fetchOverview();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDeleteOne = async (id: number) => {
    try {
      await notificationService.deleteNotification(id);
      await fetchOverview();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleDeleteRead = async () => {
    if (summary.read === 0) return;
    try {
      await notificationService.deleteReadNotifications();
      setPage(1);
      await fetchOverview();
    } catch (err) {
      console.error("Failed to delete read notifications:", err);
    }
  };

  const handleItemClick = async (notif: Notification) => {
    await handleMarkAsRead(notif);
    const targetUrl = resolveNotificationTarget(notif, userRole);
    if (targetUrl) {
      navigate(targetUrl);
    } else {
      setSelectedNotif({ ...notif, is_read: true });
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "NEW_ORDER":
      case "ORDER_UPDATE":
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <ShoppingBag size={18} />
          </div>
        );
      case "RETURN_REQUEST":
        return (
          <div className="w-10 h-10 rounded-full bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
            <RotateCcw size={18} />
          </div>
        );
      case "PAYOUT_STATUS":
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Wallet size={18} />
          </div>
        );
      case "SHOP_STATUS":
      case "PRODUCT_STATUS":
        return (
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Store size={18} />
          </div>
        );
      case "NEW_COMMENT":
        return (
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-500 shrink-0">
            <Star size={18} className="fill-amber-400 text-amber-400" />
          </div>
        );
      case "NEW_MESSAGE":
        return (
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <MessageSquare size={18} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-[#ee4d2d] shrink-0">
            <FileText size={18} />
          </div>
        );
    }
  };

  const categoryChips: Array<{
    key: "all" | NotificationCategory;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "Tất cả", count: summary.total },
    { key: "order", label: "Đơn hàng & Giao nhận", count: summary.byCategory.order },
    { key: "return", label: "Hoàn / Trả hàng", count: summary.byCategory.return },
    { key: "social", label: "Tin nhắn & Đánh giá", count: summary.byCategory.social },
    { key: "shop", label: "Gian hàng & Sản phẩm", count: summary.byCategory.shop },
    { key: "system", label: "Hệ thống & Khác", count: summary.byCategory.system },
  ];

  const getVisiblePages = (): (number | "ellipsis-start" | "ellipsis-end")[] => {
    const totalPages = pagination.totalPages || 1;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push("ellipsis-start");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis-end");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Bell size={22} className="text-[#ee4d2d]" />
            <span>Trung tâm Thông báo</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Theo dõi, tìm kiếm và tổng hợp toàn bộ thông báo hoạt động của bạn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={summary.unread === 0}
            onClick={handleMarkAllAsRead}
            className="h-9 px-3.5 rounded-lg border border-[#ee4d2d] text-[#ee4d2d] hover:bg-[#ee4d2d] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <CheckCheck size={15} />
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
          <button
            type="button"
            disabled={summary.read === 0}
            onClick={handleDeleteRead}
            className="h-9 px-3.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:border-red-500 hover:text-red-600 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Xóa thông báo đã đọc ({summary.read})</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex rounded-lg bg-gray-100 dark:bg-slate-900 p-1 self-start">
            {[
              { key: "all" as const, label: `Tất cả (${summary.total})` },
              { key: "unread" as const, label: `Chưa đọc (${summary.unread})` },
              { key: "read" as const, label: `Đã đọc (${summary.read})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-white dark:bg-slate-700 text-[#ee4d2d] shadow-xs"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm tiêu đề, nội dung, mã đơn..."
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-[#ee4d2d]"
              />
            </div>
            <button
              type="submit"
              className="h-9 px-3.5 rounded-lg bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Tìm
            </button>
          </form>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-slate-700/70">
          {categoryChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                setCategoryFilter(chip.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                categoryFilter === chip.key
                  ? "bg-[#ee4d2d] text-white border-[#ee4d2d]"
                  : "bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-[#ee4d2d]"
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-700/60">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
              <Bell size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Không tìm thấy thông báo phù hợp
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Thử đổi bộ lọc trạng thái, nhóm thông báo hoặc từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          items.map((notif) => {
            const targetUrl = resolveNotificationTarget(notif, userRole);
            const categoryLabel = getNotificationCategoryLabel(
              getNotificationCategory(notif.type)
            );
            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
                  notif.is_read
                    ? "bg-white dark:bg-slate-800 hover:bg-gray-50/70 dark:hover:bg-slate-700/30"
                    : "bg-[#fef0ed]/45 dark:bg-slate-700/35 hover:bg-[#fde6e0]/50"
                }`}
              >
                <div
                  onClick={() => handleItemClick(notif)}
                  className="flex items-start gap-3.5 flex-1 min-w-0 cursor-pointer"
                >
                  {renderIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                        {categoryLabel}
                      </span>
                      {!notif.is_read && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ee4d2d]">
                          <span className="w-2 h-2 rounded-full bg-[#ee4d2d]" />
                          Mới
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 dark:text-slate-500 ml-auto">
                        {new Date(notif.created_at).toLocaleString(locale)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mt-1.5">
                      {notif.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {formatNotificationText(notif.content)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => handleItemClick(notif)}
                    className="h-8 px-3 rounded-lg border border-[#ee4d2d]/40 text-[#ee4d2d] hover:bg-[#ee4d2d] hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{targetUrl ? "Xem chi tiết" : "Đọc thông báo"}</span>
                    {targetUrl && <ChevronRight size={13} />}
                  </button>
                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif)}
                      className="h-8 w-8 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 inline-flex items-center justify-center transition-colors cursor-pointer"
                      title="Đánh dấu đã đọc"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(notif.id)}
                    className="h-8 w-8 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:border-red-500 hover:text-red-500 inline-flex items-center justify-center transition-colors cursor-pointer"
                    title="Xóa thông báo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Trang <span className="font-bold text-gray-900 dark:text-slate-100">{page}</span> /{" "}
            {pagination.totalPages} ({pagination.total} thông báo)
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 min-w-[2.25rem] px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#ee4d2d] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            {getVisiblePages().map((item) =>
              typeof item === "string" ? (
                <span key={item} className="px-2 text-xs text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`h-9 min-w-[2.25rem] px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    page === item
                      ? "bg-[#ee4d2d] text-white border-[#ee4d2d]"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-[#ee4d2d]"
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="h-9 min-w-[2.25rem] px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#ee4d2d] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Popup Detail for System / Informational Notifications */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedNotif(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex gap-3.5 items-start mb-4">
              {renderIcon(selectedNotif.type)}
              <div className="pr-6">
                <span className="text-[10px] font-semibold text-[#ee4d2d] uppercase tracking-wider bg-[#fef0ed] px-2 py-0.5 rounded">
                  {selectedNotif.type}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mt-2">
                  {selectedNotif.title}
                </h3>
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-slate-700 py-4">
              <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {formatNotificationText(selectedNotif.content)}
              </p>
            </div>
            <div className="border-t border-gray-100 dark:border-slate-700 pt-3 flex justify-between items-center text-xs text-gray-400">
              <span>{new Date(selectedNotif.created_at).toLocaleString(locale)}</span>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 rounded-lg bg-[#ee4d2d] hover:bg-[#d03e1e] text-white font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;

