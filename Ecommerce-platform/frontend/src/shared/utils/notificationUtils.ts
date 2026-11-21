import type { Notification } from "@/services/notificationService";

export type NotificationCategory = "order" | "return" | "social" | "shop" | "system";

const POPUP_ONLY_TYPES = new Set([
  "SYSTEM",
  "ANNOUNCEMENT",
  "POLICY_UPDATE",
  "PROMOTION_INFO",
]);

export const getNotificationCategory = (type: string): NotificationCategory => {
  if (type === "NEW_ORDER" || type === "ORDER_UPDATE") return "order";
  if (type === "RETURN_REQUEST") return "return";
  if (type === "NEW_MESSAGE" || type === "NEW_COMMENT") return "social";
  if (type === "SHOP_STATUS" || type === "PRODUCT_STATUS" || type === "PAYOUT_STATUS") {
    return "shop";
  }
  return "system";
};

export const getNotificationCategoryLabel = (category: NotificationCategory): string => {
  switch (category) {
    case "order":
      return "Đơn hàng & Giao nhận";
    case "return":
      return "Hoàn / Trả hàng";
    case "social":
      return "Tin nhắn & Đánh giá";
    case "shop":
      return "Gian hàng & Sản phẩm";
    case "system":
      return "Hệ thống & Khác";
  }
};

export const resolveNotificationTarget = (
  notif: Pick<Notification, "type" | "action_url">,
  userRole?: string | null,
  pathname = ""
): string | null => {
  if (POPUP_ONLY_TYPES.has(notif.type)) {
    return null;
  }
  if (notif.action_url && notif.action_url.startsWith("/")) {
    return notif.action_url;
  }

  const inVendorPortal = pathname.startsWith("/vendor") || userRole === "vendor";
  const inAdminPortal = pathname.startsWith("/admin") || userRole === "admin";

  switch (notif.type) {
    case "NEW_ORDER":
    case "ORDER_UPDATE":
      if (inVendorPortal) return "/vendor?tab=orders";
      if (inAdminPortal) return "/admin?tab=orders";
      return "/orders";
    case "RETURN_REQUEST":
      if (inVendorPortal) return "/vendor?tab=returns";
      if (inAdminPortal) return "/admin?tab=returns";
      return "/orders";
    case "PRODUCT_STATUS":
      if (inVendorPortal) return "/vendor?tab=products";
      if (inAdminPortal) return "/admin?tab=products";
      return null;
    case "SHOP_STATUS":
      if (inVendorPortal) return "/vendor?tab=overview";
      if (inAdminPortal) return "/admin?tab=shops";
      return null;
    case "PAYOUT_STATUS":
      if (inVendorPortal) return "/vendor?tab=finance";
      if (inAdminPortal) return "/admin?tab=payouts";
      return null;
    case "NEW_COMMENT":
      if (inVendorPortal) return "/vendor?tab=interactions";
      return null;
    case "NEW_MESSAGE":
      if (inVendorPortal) return "/vendor?tab=chats";
      return null;
    default:
      return null;
  }
};

