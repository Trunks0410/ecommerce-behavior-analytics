import React, { useState } from "react";

interface AutoDispatchModalProps {
  pendingCount: number;
  onClose: () => void;
  onDispatchComplete: () => void;
}

export const AutoDispatchModal: React.FC<AutoDispatchModalProps> = ({
  pendingCount,
  onClose,
  onDispatchComplete,
}) => {
  const [stage, setStage] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);

  const startDispatch = () => {
    setStage("running");
    setProgress(15);

    const t1 = setTimeout(() => {
      setProgress(45);
    }, 500);

    const t2 = setTimeout(() => {
      setProgress(85);
    }, 1100);

    const t3 = setTimeout(() => {
      setProgress(100);
      setAssignedCount(pendingCount > 0 ? pendingCount : 18);
      setStage("done");
      onDispatchComplete();
    }, 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dispatch-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="dispatch-modal-head">
          <div className="head-text">
            <span className="dispatch-eyebrow">THUẬT TOÁN ĐIỀU PHỐI TỰ ĐỘNG · UTE EXPRESS</span>
            <h2>Phân Công Đơn Hàng Tự Động</h2>
          </div>
          <button type="button" className="btn-drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dispatch-modal-body">
          {stage === "idle" && (
            <div className="dispatch-intro">
              <div className="dispatch-kpi-box">
                <span className="kpi-label">ĐƠN CHỜ PHÂN CÔNG HIỆN TẠI</span>
                <strong className="kpi-num text-mono">{pendingCount > 0 ? pendingCount : 42} đơn</strong>
                <span className="kpi-sub">Sẵn sàng tối ưu tuyến đường cho 24 tài xế đang trực tuyến</span>
              </div>

              <div className="algorithm-rules">
                <span className="rules-heading">Nguyên tắc phân bổ thông minh:</span>
                <ul className="rules-list">
                  <li>
                    <span className="bullet">01</span>
                    <div>
                      <strong>Gom nhóm theo cụm bán kính (Geofencing)</strong>
                      <p>Tối đa 15 đơn/tài xế trên cùng phường/quận để giảm thiểu cự ly di chuyển.</p>
                    </div>
                  </li>
                  <li>
                    <span className="bullet">02</span>
                    <div>
                      <strong>Cân bằng tải theo năng lực</strong>
                      <p>Ưu tiên tài xế có tỉ lệ giao đúng hẹn &gt;95% và hiện chưa quá tải giỏ hàng.</p>
                    </div>
                  </li>
                  <li>
                    <span className="bullet">03</span>
                    <div>
                      <strong>Tối ưu hẹn giờ giao</strong>
                      <p>Ưu tiên đơn có thời gian tạo sớm nhất để đảm bảo cam kết SLA giao hàng.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {stage === "running" && (
            <div className="dispatch-running">
              <div className="progress-indicator">
                <div className="progress-bar-outer">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="progress-text text-mono">{progress}%</span>
              </div>
              <strong className="status-title">Đang tính toán tuyến đường và gán shipper...</strong>
              <p className="status-detail">
                Đang quét 24 tài xế trực tuyến tại khu vực TP. Thủ Đức, Quận 1, Bình Thạnh...
              </p>
            </div>
          )}

          {stage === "done" && (
            <div className="dispatch-done">
              <div className="success-badge-mark">
                <span className="mark-circle">✓</span>
              </div>
              <strong className="done-title">Phân công tự động thành công!</strong>
              <p className="done-desc">
                Đã gán thành công <strong>{assignedCount} đơn hàng</strong> cho 6 tài xế khu vực phù hợp. Lịch trình giao nhận đã được gửi tức thì đến thiết bị của các shipper.
              </p>
            </div>
          )}
        </div>

        <div className="dispatch-modal-footer">
          {stage === "idle" && (
            <>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Hủy bỏ
              </button>
              <button type="button" className="btn btn-primary" onClick={startDispatch}>
                Bắt đầu phân công ngay
              </button>
            </>
          )}

          {stage === "running" && (
            <button type="button" className="btn btn-secondary" disabled>
              Đang xử lý phân công...
            </button>
          )}

          {stage === "done" && (
            <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
              Hoàn tất và xem danh sách
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutoDispatchModal;

