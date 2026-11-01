import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import shipperApi, { ShopOrder } from "../api/shipperApi";
import StatusBadge from "../components/StatusBadge";
import ProofModal from "../components/ProofModal";
import FailModal from "../components/FailModal";
import WaybillDetailModal from "../components/WaybillDetailModal";

const DEMO_ORDERS: ShopOrder[] = [
  {
    id: 94021,
    shop_order_code: "DH-202405-001",
    status: "IN_TRANSIT",
    subtotal: 450000,
    shipping_fee: 30000,
    discount_amount: 0,
    final_amount: 480000,
    cod_status: "COLLECTED",
    cod_amount_collected: 480000,
    delivery_attempts: 1,
    parent_order_id: 101,
    created_at: "2024-05-24T08:30:00Z",
    updated_at: "2024-05-24T09:10:00Z",
    shipment: { id: 94021, shop_order_id: 94021, shipper_id: 101, tracking_number: "VD94021", status: "IN_TRANSIT", shipping_fee: 30000 },
    parentOrder: { id: 101, checkout_code: "ORD-94021", shipping_address: { recipient_name: "Lê Minh Tâm", phone_number: "0908123456", address_line: "Số 45 Lê Duẩn, Bến Nghé, Quận 1" }, payment_method: "COD", payment_status: "PENDING" },
  },
  {
    id: 94022,
    shop_order_code: "DH-202405-002",
    status: "PENDING_PICKUP",
    subtotal: 620000,
    shipping_fee: 25000,
    discount_amount: 0,
    final_amount: 645000,
    cod_status: "PENDING",
    delivery_attempts: 0,
    parent_order_id: 102,
    created_at: "2024-05-24T09:15:00Z",
    updated_at: "2024-05-24T09:15:00Z",
    shipment: { id: 94022, shop_order_id: 94022, shipper_id: 102, tracking_number: "VD94022", status: "PENDING_PICKUP", shipping_fee: 25000 },
    parentOrder: { id: 102, checkout_code: "ORD-94022", shipping_address: { recipient_name: "Nguyễn Bích Ngọc", phone_number: "0918765432", address_line: "Căn hộ Landmark 2, 208 Nguyễn Hữu Cảnh, Bình Thạnh" }, payment_method: "ONLINE", payment_status: "PAID" },
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
    updated_at: "2024-05-24T11:45:00Z",
    shipment: { id: 94023, shop_order_id: 94023, shipper_id: 103, tracking_number: "VD94023", status: "DELIVERED", shipping_fee: 35000 },
    parentOrder: { id: 103, checkout_code: "ORD-94023", shipping_address: { recipient_name: "Trần Quốc Tuấn", phone_number: "0934567890", address_line: "Số 88 đường 3/2, Phường 12, Quận 10" }, payment_method: "COD", payment_status: "PAID" },
  },
  {
    id: 94024,
    shop_order_code: "DH-202405-004",
    status: "PENDING_ASSIGNMENT",
    subtotal: 310000,
    shipping_fee: 25000,
    discount_amount: 0,
    final_amount: 335000,
    cod_status: "PENDING",
    delivery_attempts: 0,
    parent_order_id: 104,
    created_at: "2024-05-24T10:45:00Z",
    updated_at: "2024-05-24T10:45:00Z",
    shipment: { id: 94024, shop_order_id: 94024, shipper_id: 0, tracking_number: "VD94024", status: "PENDING_ASSIGNMENT", shipping_fee: 25000 },
    parentOrder: { id: 104, checkout_code: "ORD-94024", shipping_address: { recipient_name: "Phan Thị Hoa", phone_number: "0977889900", address_line: "Số 15 Tân Canh, Phường 1, Tân Bình" }, payment_method: "COD", payment_status: "PENDING" },
  },
  {
    id: 94025,
    shop_order_code: "DH-202405-005",
    status: "IN_TRANSIT",
    subtotal: 540000,
    shipping_fee: 30000,
    discount_amount: 0,
    final_amount: 570000,
    cod_status: "COLLECTED",
    cod_amount_collected: 570000,
    delivery_attempts: 1,
    parent_order_id: 105,
    created_at: "2024-05-24T11:20:00Z",
    updated_at: "2024-05-24T12:00:00Z",
    shipment: { id: 94025, shop_order_id: 94025, shipper_id: 101, tracking_number: "VD94025", status: "IN_TRANSIT", shipping_fee: 30000 },
    parentOrder: { id: 105, checkout_code: "ORD-94025", shipping_address: { recipient_name: "Vũ Hải Đăng", phone_number: "0903112233", address_line: "Số 12 Tôn Đức Thắng, Bến Nghé, Quận 1" }, payment_method: "COD", payment_status: "PENDING" },
  },
  {
    id: 94026,
    shop_order_code: "DH-202405-006",
    status: "FAILED",
    subtotal: 720000,
    shipping_fee: 35000,
    discount_amount: 0,
    final_amount: 755000,
    cod_status: "PENDING",
    delivery_attempts: 2,
    parent_order_id: 106,
    created_at: "2024-05-24T12:00:00Z",
    updated_at: "2024-05-24T13:30:00Z",
    shipment: { id: 94026, shop_order_id: 94026, shipper_id: 102, tracking_number: "VD94026", status: "FAILED", shipping_fee: 35000 },
    parentOrder: { id: 106, checkout_code: "ORD-94026", shipping_address: { recipient_name: "Hoàng Gia Bảo", phone_number: "0909445566", address_line: "Số 234 Nguyễn Kiệm, Gò Vấp" }, payment_method: "COD", payment_status: "FAILED" },
  },
];

export const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<ShopOrder[]>(DEMO_ORDERS);
  const [loading, setLoading] = useState(false);
  const statusFilter = searchParams.get("status") || "ALL";
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedWaybill, setSelectedWaybill] = useState<ShopOrder | null>(null);
  const [selectedProofOrder, setSelectedProofOrder] = useState<ShopOrder | null>(null);
  const [selectedFailOrder, setSelectedFailOrder] = useState<ShopOrder | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await shipperApi.getOrders({
        limit: 100,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: searchTerm || undefined,
      });
      if (res.orders && res.orders.length > 0) {
        setOrders(res.orders);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [statusFilter]);

  const handleTabChange = (val: string) => {
    if (val === "ALL") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", val);
    }
    setSearchParams(searchParams);
  };

  const handleStartDelivery = (order: ShopOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: "IN_TRANSIT" } : o))
    );
    alert(`Đã nhận giao vận đơn ${order.shipment?.tracking_number || order.id}!`);
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL") {
        const norm = (o.status || "").toUpperCase();
        if (norm !== statusFilter.toUpperCase()) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const trk = (o.shipment?.tracking_number || "").toLowerCase();
        const code = (o.shop_order_code || "").toLowerCase();
        const address = o.parentOrder?.shipping_address;
        const name = typeof address === "object" ? (address?.recipient_name || "").toLowerCase() : "";
        if (!trk.includes(q) && !code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  return (
    <div className="orders-page-shell">
      {/* Header bar */}
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">QUẢN LÝ VẬN HÀNH · UTE EXPRESS</span>
          <h1 className="page-title">Danh Sách Đơn Giao Hàng</h1>
          <p className="page-desc">Theo dõi toàn bộ bưu kiện được điều phối trên mạng lưới UTE Express.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => void loadOrders()}
          disabled={loading}
        >
          <span>↻ Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Filter and Search Card */}
      <div className="portal-panel filter-panel">
        <div className="filter-panel__top">
          <div className="filter-tab-bar">
            {[
              { label: "Tất cả", value: "ALL" },
              { label: "Chờ lấy hàng", value: "PENDING_PICKUP" },
              { label: "Đang giao", value: "IN_TRANSIT" },
              { label: "Thành công", value: "DELIVERED" },
              { label: "Giao thất bại", value: "FAILED" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`tab-pill${statusFilter === tab.value ? " is-active" : ""}`}
                onClick={() => handleTabChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="filter-search-box">
            <input
              type="text"
              className="table-search-input"
              placeholder="Tìm theo mã vận đơn, mã đơn, khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchTerm("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="portal-panel waybills-list-panel">
        <div className="table-responsive">
          <table className="orders-data-table">
            <thead>
              <tr>
                <th scope="col">Mã vận đơn</th>
                <th scope="col">Mã đơn sàn</th>
                <th scope="col">Khách hàng & Địa chỉ</th>
                <th scope="col">Thu hộ (COD)</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thời gian</th>
                <th scope="col" className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty-cell">
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const tracking = order.shipment?.tracking_number || `VD${order.id}`;
                  const address = order.parentOrder?.shipping_address;
                  const name = typeof address === "object" ? address?.recipient_name : "Khách hàng";
                  const addr = typeof address === "object" ? address?.address_line : String(address || "");
                  const isCOD = order.parentOrder?.payment_method === "COD";

                  return (
                    <tr
                      key={order.id}
                      className="table-data-row"
                      onClick={() => setSelectedWaybill(order)}
                    >
                      <td className="cell-tracking text-mono">
                        <span className="tracking-code-link">{tracking}</span>
                      </td>
                      <td className="cell-code text-mono">
                        {order.shop_order_code}
                      </td>
                      <td className="cell-customer">
                        <strong className="customer-name">{name}</strong>
                        <span className="customer-address">{addr}</span>
                      </td>
                      <td className="cell-cod text-mono">
                        {isCOD ? (
                          <strong>{Number(order.final_amount).toLocaleString("vi-VN")} ₫</strong>
                        ) : (
                          <span className="text-muted">0 ₫ (Online)</span>
                        )}
                      </td>
                      <td className="cell-status">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="cell-date text-mono">
                        {new Date(order.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="cell-actions text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-action-group">
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => setSelectedWaybill(order)}
                          >
                            Chi tiết
                          </button>
                          {order.status === "PENDING_PICKUP" && (
                            <button
                              type="button"
                              className="btn-table-action is-primary"
                              onClick={() => handleStartDelivery(order)}
                            >
                              Giao
                            </button>
                          )}
                          {["IN_TRANSIT", "SHIPPING"].includes(order.status) && (
                            <button
                              type="button"
                              className="btn-table-action is-success"
                              onClick={() => setSelectedProofOrder(order)}
                            >
                              Giao xong
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-footer-row">
          <span className="table-count-text text-mono">
            Tổng cộng: <strong>{filtered.length}</strong> đơn hàng được hiển thị
          </span>
        </div>
      </div>

      {/* Modals */}
      {selectedWaybill && (
        <WaybillDetailModal
          order={selectedWaybill}
          onClose={() => setSelectedWaybill(null)}
          onStartDelivery={handleStartDelivery}
          onMarkSuccess={(order) => setSelectedProofOrder(order)}
          onMarkFail={(order) => setSelectedFailOrder(order)}
        />
      )}

      {selectedProofOrder && (
        <ProofModal
          order={selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
          onSuccess={() => {
            setOrders((prev) =>
              prev.map((o) => (o.id === selectedProofOrder.id ? { ...o, status: "DELIVERED" } : o))
            );
          }}
        />
      )}

      {selectedFailOrder && (
        <FailModal
          order={selectedFailOrder}
          onClose={() => setSelectedFailOrder(null)}
          onSuccess={() => {
            setOrders((prev) =>
              prev.map((o) => (o.id === selectedFailOrder.id ? { ...o, status: "FAILED" } : o))
            );
          }}
        />
      )}
    </div>
  );
};

export default OrdersPage;
