export const getOrderStatusLabel = (
  status: string | undefined,
  language: "vi" | "en" = "vi",
): string => {
  if (!status) return "";
  if (language === "en") {
    const labels: Record<string, string> = {
      PENDING: "Pending confirmation",
      CONFIRMED: "Confirmed",
      PREPARING: "Preparing",
      READY_FOR_PICKUP: "Ready for pickup",
      SHIPPING: "Out for delivery",
      DELIVERING: "Out for delivery",
      DELIVERED: "Delivered",
      COMPLETED: "Completed",
      CANCEL_REQUESTED: "Cancellation requested",
      CANCELLED: "Cancelled",
      FAILED: "Delivery failed",
      RETURN_PENDING: "Returning",
      RETURNED: "Returned",
    };
    return labels[status] || status;
  }
  const labels: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    'PREPARING': 'Đang chuẩn bị',
    'READY_FOR_PICKUP': 'Sẵn sàng giao',
    'SHIPPING': 'Đang đi giao',
    'DELIVERING': 'Đang đi giao',
    DELIVERED: "Giao thành công",
    COMPLETED: "Hoàn thành",
    CANCEL_REQUESTED: "Yêu cầu hủy",
    CANCELLED: "Đã hủy",
    FAILED: "Giao thất bại",
    RETURN_PENDING: "Đang chuyển hoàn",
    RETURNED: "Đã hoàn hàng",
  };
  return labels[status] || status;
};

export const getShipmentStatusLabel = (
  status: string | undefined,
  language: "vi" | "en" = "vi",
): string => {
  if (!status) return '';
  if (language === "en") {
    const labels: Record<string, string> = {
      PENDING_PICKUP: "Awaiting pickup",
      PICKED_UP: "Picked up",
      IN_TRANSIT: "In transit",
      OUT_FOR_DELIVERY: "Out for delivery",
      DELIVERED: "Delivered",
      FAILED: "Delivery failed",
      RETURN_PENDING: "Awaiting return",
      RETURNED: "Returned",
      CANCELLED: "Cancelled",
    };
    return labels[status] || status;
  }
  const labels: Record<string, string> = {
    'PENDING_PICKUP': 'Chờ shipper nhận',
    'PICKED_UP': 'Đã lấy hàng',
    'IN_TRANSIT': 'Đang luân chuyển',
    'OUT_FOR_DELIVERY': 'Đang đi giao',
    'DELIVERED': 'Giao thành công',
    'FAILED': 'Giao thất bại',
    'RETURN_PENDING': 'Chờ chuyển hoàn',
    'RETURNED': 'Đã chuyển hoàn',
    'CANCELLED': 'Đã hủy',
  };
  return labels[status] || status;
};

export const getShopStatusLabel = (status: string | undefined): string => {
  if (!status) return "";
  const labels: Record<string, string> = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    BANNED: "Bị cấm",
  };
  return labels[status] || status;
};

export const getReconciliationStatusLabel = (
  status: string | undefined,
): string => {
  if (!status) return "";
  const labels: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    APPROVED: "Đã hoàn tất",
    REJECTED: "Thiếu tiền / Đã khóa",
  };
  return labels[status] || status;
};
