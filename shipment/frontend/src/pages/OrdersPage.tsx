import React, { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Package,
  Store,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import shipperApi, { ShopOrder } from "../api/shipperApi";
import StatusBadge from "../components/StatusBadge";
import ProofModal from "../components/ProofModal";
import FailModal from "../components/FailModal";

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedProofOrder, setSelectedProofOrder] = useState<ShopOrder | null>(null);
  const [selectedFailOrder, setSelectedFailOrder] = useState<ShopOrder | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await shipperApi.getOrders({
        limit: 100,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      });
      setOrders(res.orders || []);
    } catch (error) {
      console.error("Error loading orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleStartDelivery = async (order: ShopOrder) => {
    if (!order.shipment?.id) {
      alert("Không tìm thấy thông tin vận đơn");
      return;
    }
    if (!window.confirm(`Xác nhận bắt đầu giao đơn hàng ${order.shop_order_code}?`)) {
      return;
    }
    try {
      await shipperApi.updateShipmentStatus(order.shipment.id, {
        status: "IN_TRANSIT",
        note: "Shipper đã lấy hàng và bắt đầu giao cho người nhận",
      });
      alert("Đã nhận đơn và chuyển sang trạng thái Đang giao hàng!");
      loadOrders();
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    }
  };

  const filterTabs = [
    { label: "Tất cả", value: "" },
    { label: "Chờ lấy hàng", value: "PENDING_PICKUP" },
    { label: "Đang giao", value: "SHIPPING" },
    { label: "Đã giao thành công", value: "DELIVERED" },
    { label: "Giao thất bại", value: "FAILED" },
    { label: "Chuyển hoàn", value: "RETURN_PENDING" },
  ];

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
              Danh Sách Đơn Giao Hàng
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Quản lý và cập nhật trạng thái các bưu kiện được giao hoặc chờ lấy hàng.
            </p>
          </div>
          <button onClick={loadOrders} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {filterTabs.map((tab) => {
                const isActive = statusFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    style={{
                      padding: "0.4rem 0.875rem",
                      borderRadius: "9999px",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                      background: isActive ? "var(--color-primary)" : "#ffffff",
                      color: isActive ? "#ffffff" : "var(--color-text-main)",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", minWidth: "280px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: "2.25rem", fontSize: "0.8125rem" }}
                  placeholder="Mã đơn, mã vận đơn, số ĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Tìm
              </button>
            </form>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 0.75rem" }} />
            Đang tải danh sách đơn hàng...
          </div>
        ) : orders.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
            <Package size={48} color="#cbd5e1" style={{ margin: "0 auto 1rem" }} />
            <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--color-text-main)" }}>
              Không tìm thấy đơn hàng nào!
            </div>
            <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Hãy thử chọn bộ lọc trạng thái khác hoặc xóa từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {orders.map((order) => {
              const addr = order.parentOrder?.shipping_address;
              const recipientName = typeof addr === "object" ? addr?.recipient_name : "Khách hàng";
              const recipientPhone = typeof addr === "object" ? addr?.phone_number : "";
              const recipientAddress = typeof addr === "object"
                ? `${addr?.address_line || ""}`
                : String(addr || "Chưa có địa chỉ");

              const isCOD = order.parentOrder?.payment_method === "COD";
              const trackingNumber = order.shipment?.tracking_number;
              const latestHistory = order.shipment?.histories?.[0];

              return (
                <div key={order.id} className="card" style={{ padding: "1.5rem" }}>
                  {/* Top Bar: Code, Tracking, Badges */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1.125rem", color: "var(--color-text-main)" }}>
                        {order.shop_order_code}
                      </span>
                      {trackingNumber && (
                        <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "0.375rem", color: "#475569" }}>
                          Vận đơn: {trackingNumber}
                        </span>
                      )}
                      <StatusBadge status={order.status} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {isCOD ? (
                        <span className="badge badge-cod">
                          COD: {Number(order.final_amount).toLocaleString()}₫
                        </span>
                      ) : (
                        <span className="badge" style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}>
                          Đã thanh toán Online
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Info Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", margin: "1.25rem 0" }}>
                    {/* Recipient Details */}
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                        Thông tin người nhận
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                        {recipientName}
                      </div>
                      {recipientPhone && (
                        <div style={{ margin: "0.25rem 0" }}>
                          <a
                            href={`tel:${recipientPhone}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}
                          >
                            <Phone size={14} /> {recipientPhone}
                          </a>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                        <MapPin size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: "0.125rem" }} />
                        <span>{recipientAddress}</span>
                      </div>
                    </div>

                    {/* Shop & Items Summary */}
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                        Cửa hàng & Sản phẩm
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontWeight: 600, fontSize: "0.875rem" }}>
                        <Store size={14} color="#64748b" />
                        <span>{order.shop?.shop_name || "Cửa hàng đối tác"}</span>
                      </div>

                      <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                        {order.items?.map((item) => (
                          <div key={item.id} style={{ fontSize: "0.8125rem", color: "var(--color-text-main)", display: "flex", justifyContent: "space-between" }}>
                            <span>
                              • {item.variant?.product?.name || "Sản phẩm"} {item.variant?.title ? `(${item.variant.title})` : ""}
                            </span>
                            <span style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipment History / Proof if available */}
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                        Trạng thái vận đơn
                      </div>
                      {latestHistory ? (
                        <div style={{ fontSize: "0.8125rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                          <div style={{ fontWeight: 600 }}>{latestHistory.note || latestHistory.status}</div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                            {new Date(latestHistory.created_at).toLocaleString("vi-VN")}
                          </div>
                          {latestHistory.proof_image_url && (
                            <div style={{ marginTop: "0.5rem" }}>
                              <a
                                href={latestHistory.proof_image_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}
                              >
                                Xem ảnh bằng chứng <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                          Chưa có lịch sử cập nhật
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.75rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
                    {order.status === "PENDING_PICKUP" && (
                      <button
                        onClick={() => handleStartDelivery(order)}
                        className="btn btn-primary"
                      >
                        Nhận đơn & Bắt đầu giao
                      </button>
                    )}

                    {["SHIPPING", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order.status) && (
                      <>
                        <button
                          onClick={() => setSelectedFailOrder(order)}
                          className="btn btn-outline"
                          style={{ color: "var(--color-danger)" }}
                        >
                          Báo giao thất bại
                        </button>
                        <button
                          onClick={() => setSelectedProofOrder(order)}
                          className="btn btn-success"
                        >
                          Hoàn tất & Giao thành công
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedProofOrder && (
        <ProofModal
          order={selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
          onSuccess={loadOrders}
        />
      )}
      {selectedFailOrder && (
        <FailModal
          order={selectedFailOrder}
          onClose={() => setSelectedFailOrder(null)}
          onSuccess={loadOrders}
        />
      )}
    </div>
  );
};

export default OrdersPage;
