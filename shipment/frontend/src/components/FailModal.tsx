import React, { useState } from "react";
import { X, AlertTriangle, HelpCircle } from "lucide-react";
import shipperApi, { ShopOrder } from "../api/shipperApi";

interface FailModalProps {
  order: ShopOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export const FailModal: React.FC<FailModalProps> = ({ order, onClose, onSuccess }) => {
  const [reason, setReason] = useState("Không liên lạc được người mua");
  const [otherReason, setOtherReason] = useState("");
  const [isBomRefusal, setIsBomRefusal] = useState(true);
  const [hasPaidShippingFee, setHasPaidShippingFee] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isCOD = order.parentOrder?.payment_method === "COD";
  const isRefusal = reason === "Người mua từ chối nhận hàng";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason === "Lý do khác" && !otherReason.trim()) {
      alert("Vui lòng nhập lý do thất bại cụ thể!");
      return;
    }
    if (!order.shipment?.id) {
      alert("Không tìm thấy thông tin vận đơn của đơn hàng này!");
      return;
    }

    const finalReason = reason === "Lý do khác" ? otherReason.trim() : reason;
    const finalIsBom = isRefusal ? (isBomRefusal ? !hasPaidShippingFee : false) : undefined;
    const finalCollectedFee = isRefusal && isBomRefusal && hasPaidShippingFee ? 30000 : 0;

    try {
      setSubmitting(true);
      await shipperApi.updateShipmentStatus(order.shipment.id, {
        status: "FAILED",
        note: finalReason,
        collected_shipping_fee: finalCollectedFee,
        is_bom: finalIsBom,
      });

      alert("Đã cập nhật trạng thái giao hàng thất bại!");
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={20} color="var(--color-danger)" />
              Báo Cáo Giao Hàng Thất Bại
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Đơn hàng: <strong style={{ color: "var(--color-text-main)", fontFamily: "var(--font-mono)" }}>{order.shop_order_code}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "0.25rem" }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Reason Selection */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Lý do giao hàng không thành công <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <select
              className="select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Không liên lạc được người mua">Không liên lạc được người mua (gọi không nghe máy)</option>
              <option value="Người mua từ chối nhận hàng">Người mua từ chối nhận hàng</option>
              <option value="Sai địa chỉ giao hàng">Sai địa chỉ / Không tìm thấy địa chỉ</option>
              <option value="Khách hẹn giao lại ngày khác">Khách hẹn giao lại ngày khác</option>
              <option value="Lý do khác">Lý do khác</option>
            </select>
          </div>

          {/* Conditional: Refusal classification */}
          {isRefusal && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", padding: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#991b1b", marginBottom: "0.5rem" }}>
                Phân loại từ chối nhận hàng:
              </label>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="refusalType"
                    checked={isBomRefusal}
                    onChange={() => setIsBomRefusal(true)}
                  />
                  <span>Khách từ chối không lý do chính đáng (BOM hàng)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="refusalType"
                    checked={!isBomRefusal}
                    onChange={() => setIsBomRefusal(false)}
                  />
                  <span>Lý do chính đáng (sản phẩm hư hỏng, shop giao nhầm...)</span>
                </label>
              </div>

              {isBomRefusal && isCOD && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed #fca5a5" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", fontWeight: 600, color: "#991b1b", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={hasPaidShippingFee}
                      onChange={(e) => setHasPaidShippingFee(e.target.checked)}
                    />
                    <span>Khách đồng ý thanh toán phí hoàn hàng (30.000₫)</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Other reason input */}
          {reason === "Lý do khác" && (
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Nhập chi tiết lý do <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <textarea
                className="textarea"
                rows={3}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Ghi rõ lý do giao thất bại..."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={submitting}>
              Đóng
            </button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Xác nhận Giao Thất Bại"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FailModal;
