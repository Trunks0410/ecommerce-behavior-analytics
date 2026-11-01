import React, { useState } from "react";
import { ShopOrder } from "../api/shipperApi";
import StatusBadge from "./StatusBadge";

interface WaybillDetailModalProps {
  order: ShopOrder | null;
  onClose: () => void;
  onStartDelivery?: (order: ShopOrder) => void;
  onMarkSuccess?: (order: ShopOrder) => void;
  onMarkFail?: (order: ShopOrder) => void;
}

export const WaybillDetailModal: React.FC<WaybillDetailModalProps> = ({
  order,
  onClose,
  onStartDelivery,
  onMarkSuccess,
  onMarkFail,
}) => {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const trackingNumber =
    order.shipment?.tracking_number ||
    (order.id ? `VD${String(order.id).padStart(6, "0")}` : "VD94025");
  const address = order.parentOrder?.shipping_address;
  const recipientName =
    typeof address === "object" ? address?.recipient_name : "Khách hàng";
  const recipientPhone =
    typeof address === "object" ? address?.phone_number : "";
  const recipientAddress =
    typeof address === "object"
      ? address?.address_line || "Chưa có địa chỉ chi tiết"
      : String(address || "Chưa có địa chỉ chi tiết");
  const isCOD = order.parentOrder?.payment_method === "COD";
  const codAmount = Number(order.final_amount || 0);

  const handleCopy = () => {
    navigator.clipboard?.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusNorm = (order.status || "").toUpperCase();
  const canStart = statusNorm === "PENDING_PICKUP" || statusNorm === "ASSIGNED";
  const canComplete =
    statusNorm === "IN_TRANSIT" ||
    statusNorm === "SHIPPING" ||
    statusNorm === "OUT_FOR_DELIVERY";

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="waybill-drawer-title"
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header__info">
            <span className="drawer-eyebrow">CHI TIẾT VẬN ĐƠN · UTE EXPRESS</span>
            <div className="drawer-title-row">
              <h2 id="waybill-drawer-title" className="drawer-code">
                {trackingNumber}
              </h2>
              <button
                type="button"
                className="btn-copy"
                onClick={handleCopy}
                title="Sao chép mã vận đơn"
              >
                {copied ? "Đã chép" : "Sao chép"}
              </button>
            </div>
            <span className="drawer-subcode">
              Mã đơn sàn: <strong>{order.shop_order_code}</strong>
            </span>
          </div>
          <div className="drawer-header__meta">
            <StatusBadge status={order.status} />
            <button
              type="button"
              className="btn-drawer-close"
              onClick={onClose}
              aria-label="Đóng bảng chi tiết"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {/* Quick Stats Grid */}
          <div className="drawer-stats-grid">
            <div className="drawer-stat-card">
              <span className="stat-label">TIỀN THU HỘ (COD)</span>
              <strong className="stat-value text-mono">
                {isCOD ? `${codAmount.toLocaleString("vi-VN")} ₫` : "0 ₫ (Đã thanh toán)"}
              </strong>
            </div>
            <div className="drawer-stat-card">
              <span className="stat-label">CƯỚC VẬN CHUYỂN</span>
              <strong className="stat-value text-mono">
                {Number(order.shipping_fee || 30000).toLocaleString("vi-VN")} ₫
              </strong>
            </div>
            <div className="drawer-stat-card">
              <span className="stat-label">SỐ LẦN PHÁT HÀNG</span>
              <strong className="stat-value text-mono">
                {order.delivery_attempts || 1} / 3 lần
              </strong>
            </div>
          </div>

          {/* Section: Người Nhận & Giao Hàng */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Thông Tin Giao Nhận</h3>
            <div className="route-flow">
              <div className="route-point">
                <span className="route-point__dot route-point__dot--pickup" />
                <div className="route-point__details">
                  <span className="point-tag">ĐIỂM LẤY HÀNG</span>
                  <strong className="point-name">
                    {order.shop?.shop_name || "Trung tâm Phân phối UTE Express"}
                  </strong>
                  <p className="point-address">
                    {order.shop?.pickup_address ||
                      "Kho vận Trung tâm, Khu Công nghệ cao, TP. Thủ Đức, TP.HCM"}
                  </p>
                </div>
              </div>

              <div className="route-flow__line" />

              <div className="route-point">
                <span className="route-point__dot route-point__dot--dropoff" />
                <div className="route-point__details">
                  <span className="point-tag">ĐIỂM GIAO HÀNG</span>
                  <strong className="point-name">{recipientName || "Khách hàng"}</strong>
                  {recipientPhone && (
                    <div className="point-phone-row">
                      <span className="text-mono">{recipientPhone}</span>
                      <a href={`tel:${recipientPhone}`} className="btn-call-link">
                        Gọi điện
                      </a>
                    </div>
                  )}
                  <p className="point-address">{recipientAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Sản phẩm trong kiện hàng */}
          {order.items && order.items.length > 0 && (
            <div className="drawer-section">
              <h3 className="drawer-section-title">
                Kiện hàng ({order.items.length} mặt hàng)
              </h3>
              <div className="items-list">
                {order.items.map((item, idx) => (
                  <div className="item-row" key={item.id || idx}>
                    <div className="item-info">
                      <strong className="item-title">
                        {item.variant?.product?.name || item.variant?.title || "Sản phẩm"}
                      </strong>
                      {item.variant?.title && (
                        <span className="item-variant">Phân loại: {item.variant.title}</span>
                      )}
                    </div>
                    <div className="item-qty-price">
                      <span className="item-qty text-mono">x{item.quantity}</span>
                      <span className="item-price text-mono">
                        {Number(item.price).toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Nhật ký hành trình vận đơn */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Lịch Sử Hành Trình</h3>
            <div className="audit-timeline">
              <div className="timeline-step is-done">
                <span className="step-marker" />
                <div className="step-content">
                  <div className="step-header">
                    <strong>Tiếp nhận vận đơn thành công</strong>
                    <span className="step-time text-mono">Hệ thống UTE Express</span>
                  </div>
                  <p className="step-desc">
                    Kiện hàng được khởi tạo từ hệ thống đối tác và sẵn sàng điều phối.
                  </p>
                </div>
              </div>

              <div className="timeline-step is-done">
                <span className="step-marker" />
                <div className="step-content">
                  <div className="step-header">
                    <strong>Đã phân công tài xế</strong>
                    <span className="step-time text-mono">Điều phối khu vực</span>
                  </div>
                  <p className="step-desc">
                    Tài xế tiếp nhận lịch trình lấy hàng tại kho người gửi.
                  </p>
                </div>
              </div>

              {canComplete && (
                <div className="timeline-step is-active">
                  <span className="step-marker" />
                  <div className="step-content">
                    <div className="step-header">
                      <strong>Đang trên hành trình giao hàng</strong>
                      <span className="step-time text-mono">Đang di chuyển</span>
                    </div>
                    <p className="step-desc">
                      Tài xế đang vận chuyển kiện hàng đến địa chỉ người nhận.
                    </p>
                  </div>
                </div>
              )}

              {statusNorm === "DELIVERED" && (
                <div className="timeline-step is-done">
                  <span className="step-marker step-marker--success" />
                  <div className="step-content">
                    <div className="step-header">
                      <strong className="text-success">Giao hàng thành công</strong>
                      <span className="step-time text-mono">Hoàn tất</span>
                    </div>
                    <p className="step-desc">
                      Người nhận đã nhận hàng và xác nhận đầy đủ kiện hàng.
                    </p>
                  </div>
                </div>
              )}

              {statusNorm === "FAILED" && (
                <div className="timeline-step is-failed">
                  <span className="step-marker step-marker--danger" />
                  <div className="step-content">
                    <div className="step-header">
                      <strong className="text-danger">Giao hàng chưa thành công</strong>
                      <span className="step-time text-mono">Ghi nhận sự cố</span>
                    </div>
                    <p className="step-desc">
                      Đã lưu biên bản sự cố giao hàng và lên lịch hẹn giao lại lần tiếp theo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="drawer-footer">
          {canStart && onStartDelivery && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                onStartDelivery(order);
                onClose();
              }}
            >
              Bắt đầu giao đơn hàng
            </button>
          )}

          {canComplete && (
            <div className="drawer-footer__actions">
              {onMarkFail && (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => {
                    onMarkFail(order);
                    onClose();
                  }}
                >
                  Báo thất bại
                </button>
              )}
              {onMarkSuccess && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onMarkSuccess(order);
                    onClose();
                  }}
                >
                  Xác nhận giao thành công
                </button>
              )}
            </div>
          )}

          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaybillDetailModal;

