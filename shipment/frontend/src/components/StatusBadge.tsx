import React from "react";

const SHIPMENT_EVENT_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: "Chờ phân công shipper",
  CHUA_PHAN_CONG: "Chờ phân công shipper",
  ASSIGNED: "Đã phân công shipper",
  DA_PHAN_CONG: "Đã phân công shipper",
  ACCEPTED: "Shipper đã nhận đơn",
  PENDING_PICKUP: "Chờ lấy hàng",
  CHO_LAY_HANG: "Chờ lấy hàng",
  PICKED_UP: "Đã lấy hàng",
  IN_TRANSIT: "Đang trung chuyển",
  OUT_FOR_DELIVERY: "Đang đi giao",
  SHIPPING: "Đang đi giao",
  DANG_GIAO: "Đang đi giao",
  DELIVERED: "Giao hàng thành công",
  THANH_CONG: "Giao hàng thành công",
  FAILED: "Giao hàng thất bại",
  DELIVERY_FAILED: "Giao hàng thất bại",
  THAT_BAI: "Giao hàng thất bại",
  RETURN_PENDING: "Chờ chuyển hoàn",
  CHO_HOAN: "Chờ chuyển hoàn",
  RETURNED: "Đã chuyển hoàn",
  DA_HOAN: "Đã chuyển hoàn",
  CANCELLED: "Đã hủy",
};

export const getShipmentEventLabel = (status?: string): string => {
  const norm = (status || "").toUpperCase();
  return SHIPMENT_EVENT_LABELS[norm] || (status || "").replace(/_/g, " ");
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const norm = (status || "").toUpperCase();

  switch (norm) {
    case "PENDING_ASSIGNMENT":
    case "CHUA_PHAN_CONG":
      return (
        <span className={`status-pill status-pill--unassigned ${className}`}>
          <span className="status-pill__dot" />
          <span>Chờ phân công</span>
        </span>
      );
    case "ASSIGNED":
    case "DA_PHAN_CONG":
      return (
        <span className={`status-pill status-pill--assigned ${className}`}>
          <span className="status-pill__dot" />
          <span>Đã phân công</span>
        </span>
      );
    case "PENDING_PICKUP":
    case "ACCEPTED":
    case "CHO_LAY_HANG":
      return (
        <span className={`status-pill status-pill--pickup ${className}`}>
          <span className="status-pill__dot" />
          <span>{norm === "ACCEPTED" ? "Đã nhận đơn" : "Chờ lấy hàng"}</span>
        </span>
      );
    case "PICKED_UP":
      return (
        <span className={`status-pill status-pill--pickup ${className}`}>
          <span className="status-pill__dot" />
          <span>Đã lấy hàng</span>
        </span>
      );
    case "SHIPPING":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
    case "DANG_GIAO":
      return (
        <span className={`status-pill status-pill--transit ${className}`}>
          <span className="status-pill__dot" />
          <span>Đang giao</span>
        </span>
      );
    case "DELIVERED":
    case "THANH_CONG":
      return (
        <span className={`status-pill status-pill--delivered ${className}`}>
          <span className="status-pill__dot" />
          <span>Thành công</span>
        </span>
      );
    case "FAILED":
    case "DELIVERY_FAILED":
    case "THAT_BAI":
      return (
        <span className={`status-pill status-pill--failed ${className}`}>
          <span className="status-pill__dot" />
          <span>Giao thất bại</span>
        </span>
      );
    case "RETURN_PENDING":
    case "CHO_HOAN":
      return (
        <span className={`status-pill status-pill--return ${className}`}>
          <span className="status-pill__dot" />
          <span>Chờ hoàn trả</span>
        </span>
      );
    case "RETURNED":
    case "DA_HOAN":
      return (
        <span className={`status-pill status-pill--neutral ${className}`}>
          <span className="status-pill__dot" />
          <span>Đã hoàn trả</span>
        </span>
      );
    default:
      return (
        <span className={`status-pill status-pill--neutral ${className}`}>
          <span className="status-pill__dot" />
          <span>{status || "Chưa cập nhật"}</span>
        </span>
      );
  }
};

export default StatusBadge;
