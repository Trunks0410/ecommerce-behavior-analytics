import React, { useState } from "react";

interface DriversModalProps {
  onClose: () => void;
}

interface DriverItem {
  id: string;
  name: string;
  phone: string;
  zone: string;
  rating: number;
  ordersAssigned: number;
  ordersDeliveredToday: number;
  onTimeRate: number;
  status: "ONLINE" | "DELIVERING" | "OFFLINE";
  vehicle: string;
}

const DRIVERS_LIST: DriverItem[] = [
  { id: "SHP-101", name: "Trần Hoàng Nam", phone: "0908 123 456", zone: "Quận 1, Quận 3", rating: 4.9, ordersAssigned: 12, ordersDeliveredToday: 18, onTimeRate: 98, status: "DELIVERING", vehicle: "Honda AirBlade (59X1-884.21)" },
  { id: "SHP-102", name: "Phạm Minh Đức", phone: "0912 345 678", zone: "TP. Thủ Đức", rating: 4.7, ordersAssigned: 8, ordersDeliveredToday: 14, onTimeRate: 92, status: "ONLINE", vehicle: "Yamaha NVX (59B2-392.14)" },
  { id: "SHP-103", name: "Lê Văn Tám", phone: "0933 888 999", zone: "Bình Thạnh, Phú Nhuận", rating: 4.8, ordersAssigned: 15, ordersDeliveredToday: 22, onTimeRate: 95, status: "DELIVERING", vehicle: "Honda Wave Alpha (59P1-904.66)" },
  { id: "SHP-104", name: "Đặng Thanh Tú", phone: "0977 456 123", zone: "Tân Bình, Tân Phú", rating: 4.9, ordersAssigned: 10, ordersDeliveredToday: 19, onTimeRate: 99, status: "ONLINE", vehicle: "Honda Future (59C2-712.05)" },
  { id: "SHP-105", name: "Nguyễn Tuấn Kiệt", phone: "0909 777 666", zone: "Quận 7, Nhà Bè", rating: 4.6, ordersAssigned: 9, ordersDeliveredToday: 12, onTimeRate: 90, status: "DELIVERING", vehicle: "Yamaha Grande (59H1-645.90)" },
  { id: "SHP-106", name: "Võ Quốc Cường", phone: "0988 234 567", zone: "Gò Vấp, Quận 12", rating: 4.8, ordersAssigned: 14, ordersDeliveredToday: 20, onTimeRate: 94, status: "ONLINE", vehicle: "Honda Vision (59G2-119.82)" },
];

export const DriversModal: React.FC<DriversModalProps> = ({ onClose }) => {
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const filtered = DRIVERS_LIST.filter((d) => {
    const matchesStatus = filter === "ALL" || d.status === filter;
    const matchesSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.zone.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="drivers-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drivers-modal-header">
          <div>
            <span className="drivers-eyebrow">ĐỘI NGŨ GIAO VẬN · UTE EXPRESS FLEET</span>
            <h2 className="drivers-title">Quản Lý Danh Sách Tài Xế ({DRIVERS_LIST.length})</h2>
          </div>
          <button type="button" className="btn-drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="drivers-filter-bar">
          <input
            type="text"
            className="input input-sm"
            placeholder="Tìm theo tên, khu vực, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="status-toggle-row">
            {[
              { label: "Tất cả", value: "ALL" },
              { label: "Sẵn sàng (Online)", value: "ONLINE" },
              { label: "Đang giao đơn", value: "DELIVERING" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                className={`filter-btn-pill${filter === t.value ? " is-active" : ""}`}
                onClick={() => setFilter(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drivers Table / Cards */}
        <div className="drivers-modal-content">
          <div className="table-wrapper">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Tài xế</th>
                  <th>Khu vực phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Đơn hôm nay</th>
                  <th>Đúng hạn</th>
                  <th>Phương tiện</th>
                  <th>Liên hệ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="driver-identity">
                        <div className="driver-avatar text-mono">
                          {d.name.split(" ").map((n) => n[0]).slice(-2).join("")}
                        </div>
                        <div>
                          <strong className="driver-name">{d.name}</strong>
                          <span className="driver-rating text-mono">★ {d.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="zone-tag">{d.zone}</span>
                    </td>
                    <td>
                      {d.status === "ONLINE" && (
                        <span className="status-pill status-pill--delivered">
                          <span className="status-pill__dot" />
                          <span>Sẵn sàng</span>
                        </span>
                      )}
                      {d.status === "DELIVERING" && (
                        <span className="status-pill status-pill--transit">
                          <span className="status-pill__dot" />
                          <span>Đang giao</span>
                        </span>
                      )}
                      {d.status === "OFFLINE" && (
                        <span className="status-pill status-pill--neutral">
                          <span className="status-pill__dot" />
                          <span>Nghỉ ca</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="orders-summary text-mono">
                        <span>Đang giao: <strong>{d.ordersAssigned}</strong></span>
                        <span>Đã xong: {d.ordersDeliveredToday}</span>
                      </div>
                    </td>
                    <td>
                      <span className="rate-badge text-mono font-bold text-success">
                        {d.onTimeRate}%
                      </span>
                    </td>
                    <td>
                      <span className="vehicle-text">{d.vehicle}</span>
                    </td>
                    <td>
                      <a href={`tel:${d.phone.replace(/\s+/g, "")}`} className="btn-call-link">
                        Gọi {d.phone}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="drivers-modal-footer">
          <span className="fleet-stat text-mono">
            Đang hoạt động: <strong>24 / 28 tài xế</strong> · Tổng đơn đang xử lý: <strong>84 đơn</strong>
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriversModal;

