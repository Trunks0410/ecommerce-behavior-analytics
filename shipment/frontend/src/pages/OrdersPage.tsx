import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import shipperApi, { ShopOrder } from "../api/shipperApi";
import StatusBadge from "../components/StatusBadge";
import ProofModal from "../components/ProofModal";
import FailModal from "../components/FailModal";
import WaybillDetailModal from "../components/WaybillDetailModal";

const ACTIONS: Record<string, { label: string; run: (id: number) => Promise<unknown> }> = {
  ASSIGNED: { label: "Nhận đơn", run: shipperApi.acceptShipment },
  ACCEPTED: { label: "Xác nhận lấy hàng", run: shipperApi.pickupShipment },
  PICKED_UP: { label: "Bắt đầu vận chuyển", run: shipperApi.startShipment },
  IN_TRANSIT: { label: "Bắt đầu giao", run: shipperApi.markOutForDelivery },
};

const STATUS_TABS = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chờ phân công", value: "PENDING_ASSIGNMENT" },
  { label: "Đã phân công", value: "ASSIGNED" },
  { label: "Đang giao", value: "OUT_FOR_DELIVERY" },
  { label: "Thành công", value: "DELIVERED" },
  { label: "Thất bại / Hoàn", value: "DELIVERY_FAILED" },
];

export const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyShipmentId, setBusyShipmentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWaybill, setSelectedWaybill] = useState<ShopOrder | null>(null);
  const [selectedProofOrder, setSelectedProofOrder] = useState<ShopOrder | null>(null);
  const [selectedFailOrder, setSelectedFailOrder] = useState<ShopOrder | null>(null);
  const statusFilter = searchParams.get("status") || "ALL";

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await shipperApi.getOrders({
        limit: 100,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setOrders(result.orders);
    } catch (loadError) {
      console.error("Failed to load assigned shipments", loadError);
      setError("Không thể tải vận đơn từ UTE Express. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [statusFilter]);

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "ALL") next.delete("status");
    else next.set("status", value);
    setSearchParams(next);
  };

  const handleAdvance = async (order: ShopOrder) => {
    const shipmentId = order.shipment?.id;
    const action = ACTIONS[order.status];
    if (!shipmentId || !action) return;
    try {
      setBusyShipmentId(shipmentId);
      await action.run(shipmentId);
      await loadOrders();
    } catch (actionError: any) {
      alert(actionError.response?.data?.message || "Không thể cập nhật vận đơn.");
    } finally {
      setBusyShipmentId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const address = order.parentOrder?.shipping_address;
      const recipient = typeof address === "object" && address ? address.recipient_name : "";
      return [
        order.shipment?.tracking_number,
        order.shop_order_code,
        recipient,
        order.parentOrder?.shipping_address && typeof address !== "object" ? address : "",
      ].some((value) => String(value || "").toLocaleLowerCase().includes(query));
    });
  }, [orders, searchTerm]);

  return (
    <div className="orders-page-shell">
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">QUẢN LÝ VẬN HÀNH · UTE EXPRESS</span>
          <h1 className="page-title">Danh Sách Đơn Giao Hàng</h1>
          <p className="page-desc">Các vận đơn được phân công cho tài khoản shipper của bạn.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => void loadOrders()} disabled={loading}>
          <span>↻ Làm mới dữ liệu</span>
        </button>
      </div>

      {error && <div className="notice notice--error" role="alert">{error}</div>}

      <div className="portal-panel filter-panel">
        <div className="filter-panel__top">
          <div className="filter-tab-bar">
            {STATUS_TABS.map((tab) => (
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
              placeholder="Tìm mã vận đơn, mã đơn, khách hàng..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {searchTerm && (
              <button type="button" className="btn-clear-search" onClick={() => setSearchTerm("")}>✕</button>
            )}
          </div>
        </div>
      </div>

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
              {loading ? (
                <tr><td colSpan={7} className="table-empty-cell">Đang tải vận đơn...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-empty-cell">
                  {error ? "Không thể tải dữ liệu." : "Chưa có vận đơn phù hợp."}
                </td></tr>
              ) : filtered.map((order) => {
                const address = order.parentOrder?.shipping_address;
                const recipient = typeof address === "object" && address ? address.recipient_name : "Khách hàng";
                const addressLine = typeof address === "object" && address ? address.address_line : String(address || "");
                const action = ACTIONS[order.status];
                const isInProgress = order.status === "OUT_FOR_DELIVERY";
                return (
                  <tr key={order.id} className="table-data-row" onClick={() => setSelectedWaybill(order)}>
                    <td className="cell-tracking text-mono">{order.shipment?.tracking_number}</td>
                    <td className="cell-code text-mono">{order.shop_order_code}</td>
                    <td className="cell-customer">
                      <strong className="customer-name">{recipient}</strong>
                      <span className="customer-address">{addressLine}</span>
                    </td>
                    <td className="cell-cod text-mono">
                      {order.parentOrder?.payment_method === "COD"
                        ? `${Number(order.final_amount).toLocaleString("vi-VN")} ₫`
                        : "0 ₫ (Đã thanh toán)"}
                    </td>
                    <td className="cell-status"><StatusBadge status={order.status} /></td>
                    <td className="cell-date text-mono">
                      {new Date(order.updated_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="cell-actions text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="inline-action-group">
                        <button type="button" className="btn-table-action" onClick={() => setSelectedWaybill(order)}>Chi tiết</button>
                        {action && (
                          <button
                            type="button"
                            className="btn-table-action is-primary"
                            disabled={busyShipmentId === order.shipment?.id}
                            onClick={() => void handleAdvance(order)}
                          >
                            {busyShipmentId === order.shipment?.id ? "Đang cập nhật..." : action.label}
                          </button>
                        )}
                        {isInProgress && (
                          <>
                            <button type="button" className="btn-table-action is-success" onClick={() => setSelectedProofOrder(order)}>Giao xong</button>
                            <button type="button" className="btn-table-action" onClick={() => setSelectedFailOrder(order)}>Báo thất bại</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="panel-footer-row">
          <span className="table-count-text text-mono">Tổng cộng: <strong>{filtered.length}</strong> vận đơn</span>
        </div>
      </div>

      {selectedWaybill && (
        <WaybillDetailModal
          order={selectedWaybill}
          onClose={() => setSelectedWaybill(null)}
          onStartDelivery={(order) => void handleAdvance(order)}
          onMarkSuccess={(order) => setSelectedProofOrder(order)}
          onMarkFail={(order) => setSelectedFailOrder(order)}
        />
      )}
      {selectedProofOrder && (
        <ProofModal
          order={selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
          onSuccess={() => void loadOrders()}
        />
      )}
      {selectedFailOrder && (
        <FailModal
          order={selectedFailOrder}
          onClose={() => setSelectedFailOrder(null)}
          onSuccess={() => void loadOrders()}
        />
      )}
    </div>
  );
};

export default OrdersPage;
