import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock3,
  Package,
  RotateCw,
  Truck,
} from "lucide-react";
import shipperApi, { ShopOrder } from "../api/shipperApi";
import StatusBadge from "../components/StatusBadge";

interface DashboardSummary {
  total: number;
  pendingPickup: number;
  inTransit: number;
  delivered: number;
  failed: number;
}

const formatOrderDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const DashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [allOrders, pendingPickup, inTransit, delivered, failed] = await Promise.all([
        shipperApi.getOrders({ limit: 8 }),
        shipperApi.getOrders({ limit: 1, status: "PENDING_PICKUP" }),
        shipperApi.getOrders({ limit: 1, status: "IN_TRANSIT" }),
        shipperApi.getOrders({ limit: 1, status: "DELIVERED" }),
        shipperApi.getOrders({ limit: 1, status: "FAILED" }),
      ]);

      setOrders(allOrders.orders);
      setSummary({
        total: allOrders.total,
        pendingPickup: pendingPickup.total,
        inTransit: inTransit.total,
        delivered: delivered.total,
        failed: failed.total,
      });
    } catch (loadError) {
      console.error("Failed to load shipment dashboard", loadError);
      setError("Không thể tải dữ liệu vận đơn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const metrics = summary
    ? [
        { label: "Tổng vận đơn", value: summary.total, status: "ALL", tone: "blue", icon: Package },
        { label: "Chờ lấy hàng", value: summary.pendingPickup, status: "PENDING_PICKUP", tone: "amber", icon: Clock3 },
        { label: "Đang giao", value: summary.inTransit, status: "IN_TRANSIT", tone: "indigo", icon: Truck },
        { label: "Đã giao", value: summary.delivered, status: "DELIVERED", tone: "green", icon: CircleCheck },
        { label: "Giao thất bại", value: summary.failed, status: "FAILED", tone: "red", icon: CircleX },
      ]
    : [];

  return (
    <div className="home-dashboard">
      <header className="home-dashboard__header">
        <p className="home-dashboard__description">
          Theo dõi các vận đơn được giao và cập nhật công việc giao nhận.
        </p>
        <Link to="/orders" className="home-dashboard__primary-link">
          <ClipboardList size={17} aria-hidden="true" />
          <span>Xem vận đơn</span>
        </Link>
      </header>

      {error && (
        <div className="home-dashboard__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadDashboard()} disabled={loading}>
            <RotateCw size={15} aria-hidden="true" />
            Thử lại
          </button>
        </div>
      )}

      <section className="home-dashboard__metrics" aria-label="Thống kê vận đơn">
        {metrics.map((metric) => (
          <article
            key={metric.status}
            className={`home-metric home-metric--${metric.tone}`}
          >
            <span className="home-metric__top">
              <span className="home-metric__label">{metric.label}</span>
              <span className="home-metric__icon">
                <metric.icon size={19} strokeWidth={1.9} aria-hidden="true" />
              </span>
            </span>
            <strong className="home-metric__value">
              {loading ? <span className="home-metric__loading" aria-label="Đang tải" /> : metric.value.toLocaleString("vi-VN")}
            </strong>
            <Link
              to={metric.status === "ALL" ? "/orders" : `/orders?status=${metric.status}`}
              className="home-metric__action"
            >
              Xem danh sách
            </Link>
          </article>
        ))}
        {loading && metrics.length === 0 && (
          <div className="home-dashboard__loading" role="status">Đang tải thống kê vận đơn...</div>
        )}
      </section>

      <section className="home-dashboard__orders">
        <div className="home-dashboard__section-header">
          <div>
            <h3>Vận đơn cập nhật gần đây</h3>
            <p>{summary ? `${summary.total.toLocaleString("vi-VN")} vận đơn trong danh sách của bạn` : "Các vận đơn mới được cập nhật"}</p>
          </div>
          <Link to="/orders" className="home-dashboard__text-link">
            Tất cả vận đơn <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {loading && (
          <div className="home-dashboard__table-state" role="status">
            Đang tải danh sách vận đơn...
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="home-dashboard__empty">
            <ClipboardList size={26} aria-hidden="true" />
            <strong>Chưa có vận đơn</strong>
            <span>Các vận đơn được giao cho bạn sẽ hiển thị tại đây.</span>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="home-dashboard__table-scroll">
            <table className="home-dashboard__table">
              <thead>
                <tr>
                  <th scope="col">Mã vận đơn</th>
                  <th scope="col">Người nhận</th>
                  <th scope="col">Địa chỉ giao hàng</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const address = order.parentOrder?.shipping_address;
                  const recipient = typeof address === "object" && address
                    ? address.recipient_name
                    : null;
                  const deliveryAddress = typeof address === "object" && address
                    ? address.address_line
                    : address;

                  return (
                    <tr key={order.id}>
                      <td className="home-dashboard__tracking">
                        {order.shipment?.tracking_number || order.shop_order_code}
                      </td>
                      <td>{recipient || "Chưa có thông tin"}</td>
                      <td className="home-dashboard__address">
                        {deliveryAddress || "Chưa có địa chỉ giao hàng"}
                      </td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>{formatOrderDate(order.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && error && (
          <div className="home-dashboard__table-state">
            Danh sách vận đơn sẽ hiển thị sau khi kết nối được máy chủ.
          </div>
        )}
      </section>

    </div>
  );
};

export default DashboardPage;
