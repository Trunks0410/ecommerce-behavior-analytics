import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Clock,
  RefreshCw,
  Phone,
  MapPin,
  ChevronRight
} from "lucide-react";
import shipperApi, { ShopOrder } from "../api/shipperApi";
import StatusBadge from "../components/StatusBadge";
import ProofModal from "../components/ProofModal";
import FailModal from "../components/FailModal";

export const DashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [collectedCOD, setCollectedCOD] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProofOrder, setSelectedProofOrder] = useState<ShopOrder | null>(null);
  const [selectedFailOrder, setSelectedFailOrder] = useState<ShopOrder | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, codRes] = await Promise.all([
        shipperApi.getOrders({ limit: 50 }),
        shipperApi.getCollectedCOD()
      ]);
      setOrders(ordersRes.orders || []);
      setCollectedCOD(codRes || []);
    } catch (error) {
      console.error("Error loading dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalOrders = orders.length;
  const inTransitCount = orders.filter((o) => ["SHIPPING", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(o.status)).length;
  const pendingPickupCount = orders.filter((o) => o.status === "PENDING_PICKUP").length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;
  const failedCount = orders.filter((o) => ["FAILED", "RETURN_PENDING", "RETURNED"].includes(o.status)).length;

  const totalHeldCodAmount = collectedCOD.reduce(
    (sum, o) => sum + Number(o.cod_amount_collected || 0),
    0
  );

  const activeOrders = orders.filter((o) =>
    ["SHIPPING", "PENDING_PICKUP", "IN_TRANSIT"].includes(o.status)
  );

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container">
        {/* Page Title & Refresh */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
              Bảng Điều Khiển Giao Hàng
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Theo dõi tiến độ giao nhận bưu kiện và thu hộ tiền mặt (COD) theo thời gian thực.
            </p>
          </div>
          <button onClick={loadData} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        {/* COD Alert Banner if holding cash */}
        {totalHeldCodAmount > 0 && (
          <div style={{
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "1px solid #f59e0b",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem 1.5rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "var(--shadow-sm)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: "3rem",
                height: "3rem",
                borderRadius: "0.75rem",
                background: "#f59e0b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 6px -1px rgba(245, 158, 11, 0.3)"
              }}>
                <DollarSign size={24} />
              </div>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Tiền Mặt Thu Hộ (COD) Đang Giữ
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#78350f" }}>
                  {totalHeldCodAmount.toLocaleString()} ₫
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#92400e", marginLeft: "0.5rem" }}>
                    ({collectedCOD.length} đơn hàng)
                  </span>
                </div>
              </div>
            </div>
            <Link to="/reconciliation" className="btn btn-warning" style={{ color: "#ffffff", fontWeight: 700 }}>
              Bàn Giao & Đối Soát COD <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem"
        }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Tất cả đơn hàng</span>
              <Package size={18} />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>{totalOrders}</div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Trong hệ thống</span>
          </div>

          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--color-warning)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#d97706", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Chờ lấy hàng</span>
              <Clock size={18} />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#b45309" }}>{pendingPickupCount}</div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Chờ tại shop / bưu cục</span>
          </div>

          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--color-primary)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--color-primary)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Đang giao hàng</span>
              <Truck size={18} />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-primary)" }}>{inTransitCount}</div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Đang trên đường giao</span>
          </div>

          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--color-success)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--color-success)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Giao thành công</span>
              <CheckCircle2 size={18} />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-success)" }}>{deliveredCount}</div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Đã giao khách</span>
          </div>

          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--color-danger)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--color-danger)", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Thất bại / Hoàn trả</span>
              <AlertTriangle size={18} />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-danger)" }}>{failedCount}</div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Cần xử lý lại</span>
          </div>
        </div>

        {/* Active Deliveries List */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                Bưu Kiện Cần Xử Lý Ngay ({activeOrders.length})
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                Danh sách các bưu kiện đang chờ giao hoặc lấy hàng
              </p>
            </div>
            <Link to="/orders" className="btn btn-outline btn-sm">
              Xem tất cả đơn hàng <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
              Đang tải dữ liệu...
            </div>
          ) : activeOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
              <CheckCircle2 size={40} color="var(--color-success)" style={{ margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>Không có bưu kiện tồn đọng!</div>
              <p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>Tất cả các đơn đã được hoàn tất hoặc chưa có đơn mới.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {activeOrders.slice(0, 5).map((order) => {
                const addr = order.parentOrder?.shipping_address;
                const recipientText = typeof addr === "object"
                  ? `${addr?.recipient_name || ""} - ${addr?.phone_number || ""} - ${addr?.address_line || ""}`
                  : String(addr || "Chưa có địa chỉ");
                const isCOD = order.parentOrder?.payment_method === "COD";

                return (
                  <div
                    key={order.id}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "1rem",
                      background: "#ffffff"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.875rem" }}>
                          {order.shop_order_code}
                        </span>
                        <StatusBadge status={order.status} />
                        {isCOD && (
                          <span className="badge badge-cod">
                            COD: {Number(order.final_amount).toLocaleString()}₫
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        <MapPin size={14} color="#64748b" />
                        <span>{recipientText}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => setSelectedFailOrder(order)}
                        className="btn btn-outline btn-sm"
                        style={{ color: "var(--color-danger)" }}
                      >
                        Báo thất bại
                      </button>
                      <button
                        onClick={() => setSelectedProofOrder(order)}
                        className="btn btn-success btn-sm"
                      >
                        Giao thành công
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedProofOrder && (
        <ProofModal
          order={selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
          onSuccess={loadData}
        />
      )}
      {selectedFailOrder && (
        <FailModal
          order={selectedFailOrder}
          onClose={() => setSelectedFailOrder(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default DashboardPage;
