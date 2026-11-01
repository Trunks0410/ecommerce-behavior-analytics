import React from "react";

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
    case "CHO_LAY_HANG":
      return (
        <span className={`status-pill status-pill--pickup ${className}`}>
          <span className="status-pill__dot" />
          <span>Chờ lấy hàng</span>
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
