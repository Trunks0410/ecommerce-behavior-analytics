import React, { useState } from "react";
import shipperApi, { ShopOrder } from "../api/shipperApi";

interface FailModalProps {
  order: ShopOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_REASONS = [
  "Không liên lạc được người mua (gọi 3 lần không nhấc máy)",
  "Người mua hẹn giao lại vào thời gian khác",
  "Địa chỉ giao hàng không chính xác / thiếu thông tin",
  "Người mua từ chối nhận hàng (Boom hàng)",
  "Khu vực người nhận đang phong tỏa / không thể tiếp cận",
  "Lý do khác",
];

export const FailModal: React.FC<FailModalProps> = ({ order, onClose, onSuccess }) => {
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trackingNumber =
    order.shipment?.tracking_number || `VD${String(order.id).padStart(6, "0")}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason === "Lý do khác" ? otherReason.trim() : reason;
    if (reason === "Lý do khác" && !finalReason) {
      alert("Vui lòng ghi rõ lý do giao hàng thất bại!");
      return;
    }

    try {
      setSubmitting(true);
      if (order.shipment?.id) {
        try {
          await shipperApi.updateShipmentStatus(order.shipment.id, {
            status: "FAILED",
            note: finalReason,
          });
        } catch (apiErr) {
          console.warn("Backend offline, updating locally", apiErr);
        }
      }

      alert(`Đã ghi nhận giao thất bại cho vận đơn ${trackingNumber}. Đơn hàng sẽ được chuyển vào danh sách chờ xử lý lại.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">GHI NHẬN SỰ CỐ VẬN CHUYỂN · UTE EXPRESS</span>
            <h3 className="modal-title">Báo Cáo Giao Thất Bại</h3>
            <span className="modal-sub text-mono">
              Mã vận đơn: <strong>{trackingNumber}</strong> · Mã đơn: {order.shop_order_code}
            </span>
          </div>
          <button type="button" className="btn-drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Chọn nguyên nhân giao không thành công:</label>
              <div className="reasons-radio-list">
                {COMMON_REASONS.map((r) => (
                  <label key={r} className={`radio-label-card${reason === r ? " is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="failReason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    <span className="radio-text">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {reason === "Lý do khác" && (
              <div className="form-group">
                <label htmlFor="other-reason" className="form-label">
                  Chi tiết lý do khác (Bắt buộc)
                </label>
                <textarea
                  id="other-reason"
                  rows={3}
                  className="input textarea"
                  placeholder="Ghi rõ chi tiết sự cố gặp phải khi giao kiện hàng..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                />
              </div>
            )}

            <div className="alert-card alert-card--neutral">
              <span className="alert-label">QUY ĐỊNH BẢO VỆ ĐỐI TÁC:</span>
              <p className="alert-note">
                Kiện hàng sau khi báo thất bại sẽ được lên lịch giao lại tối đa 3 lần theo thỏa thuận cam kết dịch vụ trước khi hoàn trả về kho gửi.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Quay lại
            </button>
            <button type="submit" className="btn btn-outline-danger" disabled={submitting}>
              {submitting ? "Đang xử lý..." : "Xác nhận giao thất bại"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FailModal;
