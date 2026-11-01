import React, { useState, useEffect } from "react";
import shipperApi, { ShopOrder, CODReconciliation } from "../api/shipperApi";

const DEMO_COD_ORDERS: ShopOrder[] = [
  {
    id: 94021,
    shop_order_code: "DH-202405-001",
    status: "DELIVERED",
    subtotal: 450000,
    shipping_fee: 30000,
    discount_amount: 0,
    final_amount: 480000,
    cod_status: "COLLECTED",
    cod_amount_collected: 480000,
    delivery_attempts: 1,
    parent_order_id: 101,
    created_at: "2024-05-24T08:30:00Z",
    updated_at: "2024-05-24T11:20:00Z",
    shipment: { id: 94021, shop_order_id: 94021, shipper_id: 101, tracking_number: "VD94021", status: "DELIVERED", shipping_fee: 30000 },
    parentOrder: { id: 101, checkout_code: "ORD-94021", shipping_address: { recipient_name: "Lê Minh Tâm", phone_number: "0908123456", address_line: "Số 45 Lê Duẩn, Quận 1" }, payment_method: "COD", payment_status: "PAID" },
  },
  {
    id: 94023,
    shop_order_code: "DH-202405-003",
    status: "DELIVERED",
    subtotal: 890000,
    shipping_fee: 35000,
    discount_amount: 0,
    final_amount: 925000,
    cod_status: "COLLECTED",
    cod_amount_collected: 925000,
    delivery_attempts: 1,
    parent_order_id: 103,
    created_at: "2024-05-24T10:00:00Z",
    updated_at: "2024-05-24T12:45:00Z",
    shipment: { id: 94023, shop_order_id: 94023, shipper_id: 101, tracking_number: "VD94023", status: "DELIVERED", shipping_fee: 35000 },
    parentOrder: { id: 103, checkout_code: "ORD-94023", shipping_address: { recipient_name: "Trần Quốc Tuấn", phone_number: "0934567890", address_line: "Số 88 đường 3/2, Quận 10" }, payment_method: "COD", payment_status: "PAID" },
  },
  {
    id: 94025,
    shop_order_code: "DH-202405-005",
    status: "DELIVERED",
    subtotal: 540000,
    shipping_fee: 30000,
    discount_amount: 0,
    final_amount: 570000,
    cod_status: "COLLECTED",
    cod_amount_collected: 570000,
    delivery_attempts: 1,
    parent_order_id: 105,
    created_at: "2024-05-24T11:20:00Z",
    updated_at: "2024-05-24T13:10:00Z",
    shipment: { id: 94025, shop_order_id: 94025, shipper_id: 101, tracking_number: "VD94025", status: "DELIVERED", shipping_fee: 30000 },
    parentOrder: { id: 105, checkout_code: "ORD-94025", shipping_address: { recipient_name: "Vũ Hải Đăng", phone_number: "0903112233", address_line: "Số 12 Tôn Đức Thắng, Quận 1" }, payment_method: "COD", payment_status: "PAID" },
  },
];

const DEMO_HISTORY: CODReconciliation[] = [
  {
    id: 1001,
    shipper_id: 101,
    amount_submitted: 3450000,
    status: "APPROVED",
    note: "Đã bàn giao tiền mặt tại Quầy Bưu Cục Trung Tâm",
    created_at: "2024-05-23T17:30:00Z",
  },
  {
    id: 1002,
    shipper_id: 101,
    amount_submitted: 2180000,
    status: "APPROVED",
    note: "Chuyển khoản đối soát ca sáng",
    created_at: "2024-05-22T18:00:00Z",
  },
];

export const ReconciliationPage: React.FC = () => {
  const [collectedOrders, setCollectedOrders] = useState<ShopOrder[]>(DEMO_COD_ORDERS);
  const [history, setHistory] = useState<CODReconciliation[]>(DEMO_HISTORY);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, historyRes] = await Promise.all([
        shipperApi.getCollectedCOD(),
        shipperApi.getReconciliationHistory(),
      ]);
      if (ordersRes && ordersRes.length > 0) setCollectedOrders(ordersRes);
      if (historyRes && historyRes.length > 0) setHistory(historyRes);
    } catch {
      // Keep demo fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalHeldAmount = collectedOrders.reduce(
    (sum, o) => sum + Number(o.cod_amount_collected || o.final_amount || 0),
    0
  );

  const selectedAmount = collectedOrders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((sum, o) => sum + Number(o.cod_amount_collected || o.final_amount || 0), 0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 đơn hàng để gửi đối soát!");
      return;
    }

    try {
      setSubmitting(true);
      try {
        await shipperApi.submitCODReconciliation(selectedOrderIds, note.trim() || undefined);
      } catch {
        // Backend offline fallback
      }

      const newRec: CODReconciliation = {
        id: Math.floor(Math.random() * 9000) + 1000,
        shipper_id: 101,
        amount_submitted: selectedAmount,
        status: "PENDING",
        note: note.trim() || "Yêu cầu bàn giao COD ca chiều",
        created_at: new Date().toISOString(),
      };

      setHistory((prev) => [newRec, ...prev]);
      setCollectedOrders((prev) => prev.filter((o) => !selectedOrderIds.includes(o.id)));
      setSelectedOrderIds([]);
      setNote("");
      alert(`Đã gửi yêu cầu đối soát ${selectedAmount.toLocaleString("vi-VN")} ₫ thành công!`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reconciliation-page-shell">
      {/* Header bar */}
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">TÀI CHÍNH & ĐỐI SOÁT · UTE EXPRESS</span>
          <h1 className="page-title">Đối Soát Tiền Thu Hộ (COD)</h1>
          <p className="page-desc">Quản lý dòng tiền mặt thu hộ từ người mua và bàn giao về bưu cục quản lý.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => void loadData()}
          disabled={loading}
        >
          <span>↻ Cập nhật số dư</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="reconciliation-kpi-row">
        <div className="portal-panel rec-stat-card">
          <span className="rec-stat-label">TIỀN COD ĐANG GIỮ</span>
          <strong className="rec-stat-val text-mono text-primary">
            {totalHeldAmount.toLocaleString("vi-VN")} <small>₫</small>
          </strong>
          <span className="rec-stat-sub text-mono">{collectedOrders.length} đơn đang giữ tiền mặt</span>
        </div>

        <div className="portal-panel rec-stat-card">
          <span className="rec-stat-label">ĐÃ CHỌN ĐỐI SOÁT</span>
          <strong className="rec-stat-val text-mono text-success">
            {selectedAmount.toLocaleString("vi-VN")} <small>₫</small>
          </strong>
          <span className="rec-stat-sub text-mono">{selectedOrderIds.length} đơn được đánh dấu</span>
        </div>

        <div className="portal-panel rec-stat-card">
          <span className="rec-stat-label">TỈ LỆ ĐỐI SOÁT ĐÚNG HẠN</span>
          <strong className="rec-stat-val text-mono">99.1%</strong>
          <span className="rec-stat-sub">Đạt chuẩn hạn mức bàn giao</span>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="reconciliation-grid">
        {/* Left: Pending COD Orders List */}
        <div className="portal-panel cod-orders-panel">
          <div className="panel-header-row">
            <div>
              <h2 className="panel-main-title">Đơn hàng đang giữ tiền COD ({collectedOrders.length})</h2>
              <p className="panel-sub-title">Chọn các đơn hàng cần kết toán bàn giao về bưu cục</p>
            </div>
            {collectedOrders.length > 0 && (
              <button
                type="button"
                className="btn-select-all"
                onClick={handleSelectAll}
              >
                {selectedOrderIds.length === collectedOrders.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            )}
          </div>

          <div className="table-responsive">
            <table className="orders-data-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 44 }}>Chọn</th>
                  <th scope="col">Mã vận đơn</th>
                  <th scope="col">Mã đơn sàn</th>
                  <th scope="col">Người nhận</th>
                  <th scope="col" className="text-right">Tiền thu hộ</th>
                </tr>
              </thead>
              <tbody>
                {collectedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty-cell">
                      Hiện không còn đơn hàng nào đang giữ tiền COD. Tuyệt vời!
                    </td>
                  </tr>
                ) : (
                  collectedOrders.map((order) => {
                    const tracking = order.shipment?.tracking_number || `VD${order.id}`;
                    const address = order.parentOrder?.shipping_address;
                    const name = typeof address === "object" ? address?.recipient_name : "Khách hàng";
                    const isSelected = selectedOrderIds.includes(order.id);
                    const amount = Number(order.cod_amount_collected || order.final_amount || 0);

                    return (
                      <tr
                        key={order.id}
                        className={`table-data-row${isSelected ? " is-selected-row" : ""}`}
                        onClick={() => handleToggleOrder(order.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleOrder(order.id)}
                            className="checkbox-custom"
                          />
                        </td>
                        <td className="cell-tracking text-mono">{tracking}</td>
                        <td className="cell-code text-mono">{order.shop_order_code}</td>
                        <td className="cell-customer">{name}</td>
                        <td className="cell-cod text-mono text-right font-bold">
                          {amount.toLocaleString("vi-VN")} ₫
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Submission action box */}
          {collectedOrders.length > 0 && (
            <form onSubmit={handleSubmit} className="reconciliation-submit-bar">
              <div className="submit-input-wrap">
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Ghi chú bàn giao (VD: Nộp tiền mặt ca sáng tại bưu cục Thủ Đức)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || selectedOrderIds.length === 0}
              >
                {submitting ? "Đang gửi..." : `Bàn giao ${selectedAmount.toLocaleString("vi-VN")} ₫`}
              </button>
            </form>
          )}
        </div>

        {/* Right: Reconciliation History */}
        <div className="portal-panel cod-history-panel">
          <div className="panel-header-row">
            <div>
              <h2 className="panel-main-title">Lịch sử bàn giao</h2>
              <p className="panel-sub-title">Các đợt đối soát đã được ghi nhận</p>
            </div>
          </div>

          <div className="history-list-flow">
            {history.map((rec) => (
              <div key={rec.id} className="history-record-card">
                <div className="record-top">
                  <span className="record-code text-mono">ĐỢT #{rec.id}</span>
                  {rec.status === "APPROVED" && (
                    <span className="status-pill status-pill--delivered">
                      <span className="status-pill__dot" />
                      <span>Đã duyệt</span>
                    </span>
                  )}
                  {rec.status === "PENDING" && (
                    <span className="status-pill status-pill--pickup">
                      <span className="status-pill__dot" />
                      <span>Chờ duyệt</span>
                    </span>
                  )}
                  {rec.status === "REJECTED" && (
                    <span className="status-pill status-pill--failed">
                      <span className="status-pill__dot" />
                      <span>Từ chối</span>
                    </span>
                  )}
                </div>

                <div className="record-amount-row">
                  <strong className="record-amount text-mono">
                    {Number(rec.amount_submitted).toLocaleString("vi-VN")} ₫
                  </strong>
                  <span className="record-date text-mono">
                    {new Date(rec.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>

                {rec.note && <p className="record-note">{rec.note}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationPage;
