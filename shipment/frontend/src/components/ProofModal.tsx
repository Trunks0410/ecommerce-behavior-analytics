import React, { useState, useRef } from "react";
import { X, Upload, CheckCircle2, DollarSign, Camera, AlertCircle } from "lucide-react";
import shipperApi, { ShopOrder } from "../api/shipperApi";

interface ProofModalProps {
  order: ShopOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProofModal: React.FC<ProofModalProps> = ({ order, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCOD = order.parentOrder?.payment_method === "COD";
  const codAmount = order.final_amount || 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Vui lòng chụp ảnh hoặc tải lên hình ảnh bằng chứng giao hàng thành công!");
      return;
    }
    if (!order.shipment?.id) {
      alert("Không tìm thấy thông tin vận đơn của đơn hàng này!");
      return;
    }

    try {
      setSubmitting(true);
      // 1. Upload proof image
      const uploadedUrls = await shipperApi.uploadImage(file);
      const proofUrl = uploadedUrls[0];

      // 2. Update status to DELIVERED
      await shipperApi.updateShipmentStatus(order.shipment.id, {
        status: "DELIVERED",
        note: note.trim() || "Giao hàng thành công",
        proof_image_url: proofUrl,
      });

      alert("Cập nhật giao hàng thành công!");
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
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
              <CheckCircle2 size={20} color="var(--color-success)" />
              Xác Nhận Giao Hàng Thành Công
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Đơn hàng: <strong style={{ color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>{order.shop_order_code}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "0.25rem" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* COD Collection Notice */}
        {isCOD && (
          <div style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem"
          }}>
            <div style={{ background: "#fef08a", color: "#854d0e", padding: "0.375rem", borderRadius: "0.5rem" }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#92400e" }}>
                Thu Tiền Mặt COD: {Number(codAmount).toLocaleString()} ₫
              </div>
              <p style={{ fontSize: "0.75rem", color: "#b45309", marginTop: "0.125rem" }}>
                Vui lòng thu đủ số tiền mặt trên từ khách hàng trước khi bàn giao bưu kiện.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Photo Upload Area */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Ảnh bằng chứng giao hàng <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {preview ? (
              <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", border: "2px solid var(--color-border)" }}>
                <img src={preview} alt="Bằng chứng" style={{ width: "100%", maxHeight: "240px", objectFit: "contain", background: "#f8fafc" }} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline btn-sm"
                  style={{ position: "absolute", bottom: "0.75rem", right: "0.75rem", background: "rgba(255,255,255,0.9)" }}
                >
                  <Camera size={14} /> Chụp lại
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--color-border-dark)",
                  borderRadius: "var(--radius-lg)",
                  padding: "2rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#f8fafc",
                  transition: "background 0.2s"
                }}
              >
                <div style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "50%",
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.75rem"
                }}>
                  <Camera size={24} />
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-main)" }}>
                  Chụp ảnh hoặc Chọn ảnh bằng chứng
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Chụp ảnh gói hàng tại địa chỉ giao hàng hoặc có chữ ký / người nhận
                </p>
              </div>
            )}
          </div>

          {/* Note Input */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Ghi chú giao hàng (Tùy chọn)
            </label>
            <input
              type="text"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Đã giao cho bảo vệ, người nhà nhận thay..."
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-success" disabled={submitting || !file}>
              {submitting ? "Đang xử lý..." : "Xác nhận Giao Thành Công"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProofModal;
