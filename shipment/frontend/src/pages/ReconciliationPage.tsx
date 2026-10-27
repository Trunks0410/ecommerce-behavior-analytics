import React, { useState, useEffect } from "react";
import { DollarSign, RefreshCw, Send, CheckCircle2, Clock, AlertCircle, FileText, CheckSquare, Square } from "lucide-react";
import shipperApi, { ShopOrder, CODReconciliation } from "../api/shipperApi";

export const ReconciliationPage: React.FC = () => {
  const [collectedOrders, setCollectedOrders] = useState<ShopOrder[]>([]);
  const [history, setHistory] = useState<CODReconciliation[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, historyRes] = await Promise.all([
        shipperApi.getCollectedCOD(),
        shipperApi.getReconciliationHistory(),
      ]);
      setCollectedOrders(ordersRes || []);
      setHistory(historyRes || []);
      setSelectedOrderIds([]);
    } catch (error) {
      console.error("Error loading reconciliation data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalHeldAmount = collectedOrders.reduce(
    (sum, o) => sum + Number(o.cod_amount_collected || 0),
    0
  );

  const selectedAmount = collectedOrders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((sum, o) => sum + Number(o.cod_amount_collected || 0), 0);

  const handleToggleOrder = (id: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === collectedOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(collectedOrders.map((o) => o.id));
    }
  };

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) {
      alert("Vui lòng tích chọn ít nhất 1 đơn hàng để gửi đối soát!");
      return;
    }
    if (!window.confirm(`Xác nhận gửi yêu cầu đối soát cho ${selectedOrderIds.length} đơn hàng với số tiền ${selectedAmount.toLocaleString()} ₫?`)) {
      return;
    }

    try {
      setSubmitting(true);
      await shipperApi.submitCODReconciliation(selectedOrderIds, note.trim() || undefined);
      alert("Gửi yêu cầu đối soát COD thành công!");
      setNote("");
      loadData();
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="badge badge-delivered"><CheckCircle2 size={12} /> Đã duyệt</span>;
      case "REJECTED":
        return <span className="badge badge-failed"><AlertCircle size={12} /> Bị từ chối</span>;
      default:
        return <span className="badge badge-pending"><Clock size={12} /> Chờ duyệt</span>;
    }
  };

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
              Đối Soát Tiền Mặt COD
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Bàn giao tiền mặt thu hộ cho bưu cục và kiểm tra lịch sử phê duyệt đối soát.
            </p>
          </div>
          <button onClick={loadData} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        {/* 2 Columns: Held Cash Checklist & Reconciliation History */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.75rem" }}>
          {/* Left: Orders Held Cash & Submission */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                  Đơn Hàng Đang Giữ Tiền ({collectedOrders.length})
                </h2>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Tổng tiền đang giữ: <strong style={{ color: "#d97706", fontSize: "1rem" }}>{totalHeldAmount.toLocaleString()} ₫</strong>
                </div>
              </div>

              {collectedOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="btn btn-outline btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
                >
                  {selectedOrderIds.length === collectedOrders.length ? (
                    <><CheckSquare size={14} /> Bỏ chọn</>
                  ) : (
                    <><Square size={14} /> Chọn tất cả</>
                  )}
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
                Đang tải dữ liệu...
              </div>
            ) : collectedOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
                <CheckCircle2 size={40} color="var(--color-success)" style={{ margin: "0 auto 0.75rem" }} />
                <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                  Bạn không giữ tiền mặt thu hộ nào!
                </div>
                <p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                  Toàn bộ đơn hàng COD đã được nộp hoặc chưa có đơn phát sinh.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReconciliation}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "420px", overflowY: "auto", paddingRight: "0.5rem", marginBottom: "1.25rem" }}>
                  {collectedOrders.map((order) => {
                    const isChecked = selectedOrderIds.includes(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => handleToggleOrder(order.id)}
                        style={{
                          border: "1px solid",
                          borderColor: isChecked ? "var(--color-primary)" : "var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.875rem 1rem",
                          cursor: "pointer",
                          background: isChecked ? "var(--color-primary-light)" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                          />
                          <div>
                            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.875rem" }}>
                              {order.shop_order_code}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                              {order.shop?.shop_name || "Cửa hàng đối tác"}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#b45309" }}>
                            {Number(order.cod_amount_collected || 0).toLocaleString()} ₫
                          </div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                            {new Date(order.updated_at).toLocaleDateString("vi-VN")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Area */}
                <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Số đơn đã chọn:</span>
                    <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>{selectedOrderIds.length} đơn</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Tổng tiền đối soát:</span>
                    <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "#b45309" }}>
                      {selectedAmount.toLocaleString()} ₫
                    </span>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
                      Ghi chú đợt đối soát
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ví dụ: Nộp tiền ca chiều cho bưu cục Q.1..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-warning"
                    disabled={submitting || selectedOrderIds.length === 0}
                    style={{ width: "100%", color: "#ffffff", fontWeight: 700 }}
                  >
                    <Send size={16} />
                    {submitting ? "Đang gửi..." : "Gửi Yêu Cầu Bàn Giao & Đối Soát"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right: Reconciliation History */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                Lịch Sử Bàn Giao ({history.length})
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                Các đợt đối soát tiền mặt đã gửi lên hệ thống quản lý.
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
                Đang tải dữ liệu...
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
                <FileText size={40} color="#cbd5e1" style={{ margin: "0 auto 0.75rem" }} />
                <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                  Chưa có lịch sử đối soát nào!
                </div>
                <p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                  Khi bạn gửi yêu cầu đối soát, thông tin sẽ được lưu tại đây.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "560px", overflowY: "auto", paddingRight: "0.5rem" }}>
                {history.map((recon) => (
                  <div
                    key={recon.id}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                      background: "#ffffff"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                        {new Date(recon.created_at).toLocaleString("vi-VN")}
                      </span>
                      {getStatusBadge(recon.status)}
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Số tiền bàn giao:</span>
                      <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--color-text-main)" }}>
                        {Number(recon.amount_submitted).toLocaleString()} ₫
                      </span>
                    </div>

                    {recon.note && (
                      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontStyle: "italic", background: "#f8fafc", padding: "0.375rem 0.5rem", borderRadius: "0.25rem" }}>
                        Ghi chú: {recon.note}
                      </p>
                    )}

                    {recon.orders && recon.orders.length > 0 && (
                      <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        Gồm {recon.orders.length} đơn: {recon.orders.map((o) => o.shop_order_code).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationPage;
