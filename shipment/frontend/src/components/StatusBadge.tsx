import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Truck, RotateCcw } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status?.toUpperCase()) {
    case "PENDING_PICKUP":
      return (
        <span className="badge badge-pending">
          <Clock size={12} /> Chờ lấy hàng
        </span>
      );
    case "SHIPPING":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return (
        <span className="badge badge-shipping">
          <Truck size={12} /> Đang giao hàng
        </span>
      );
    case "DELIVERED":
      return (
        <span className="badge badge-delivered">
          <CheckCircle2 size={12} /> Giao thành công
        </span>
      );
    case "FAILED":
      return (
        <span className="badge badge-failed">
          <AlertTriangle size={12} /> Giao thất bại
        </span>
      );
    case "RETURN_PENDING":
      return (
        <span className="badge badge-pending">
          <RotateCcw size={12} /> Chờ hoàn trả
        </span>
      );
    case "RETURNED":
      return (
        <span className="badge" style={{ background: "#f3f4f6", color: "#4b5563", border: "1px solid #e5e7eb" }}>
          <RotateCcw size={12} /> Đã hoàn trả
        </span>
      );
    default:
      return (
        <span className="badge" style={{ background: "#f1f5f9", color: "#475569" }}>
          {status || "N/A"}
        </span>
      );
  }
};

export default StatusBadge;
