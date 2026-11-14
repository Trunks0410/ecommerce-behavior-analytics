import React, { useState } from "react";

interface LiveMapModalProps {
  onClose: () => void;
}

interface SimulatedCourier {
  id: string;
  name: string;
  plate: string;
  zone: string;
  ordersCount: number;
  status: "moving" | "delivering" | "idle";
  x: number; // percentage
  y: number; // percentage
  speed: string;
  currentStop: string;
}

const INITIAL_COURIERS: SimulatedCourier[] = [
  { id: "TX-01", name: "Trần Hoàng Nam", plate: "59X1-884.21", zone: "Quận 1", ordersCount: 12, status: "delivering", x: 42, y: 55, speed: "24 km/h", currentStop: "Đinh Tiên Hoàng, Đa Kao" },
  { id: "TX-02", name: "Phạm Minh Đức", plate: "59B2-392.14", zone: "Thủ Đức", ordersCount: 8, status: "moving", x: 72, y: 35, speed: "38 km/h", currentStop: "Võ Văn Ngân, Linh Chiểu" },
  { id: "TX-03", name: "Lê Văn Tám", plate: "59P1-904.66", zone: "Bình Thạnh", ordersCount: 15, status: "delivering", x: 55, y: 40, speed: "18 km/h", currentStop: "Bạch Đằng, Phường 24" },
  { id: "TX-04", name: "Đặng Thanh Tú", plate: "59C2-712.05", zone: "Tân Bình", ordersCount: 10, status: "moving", x: 28, y: 48, speed: "32 km/h", currentStop: "Cộng Hòa, Phường 13" },
  { id: "TX-05", name: "Nguyễn Tuấn Kiệt", plate: "59H1-645.90", zone: "Quận 7", ordersCount: 9, status: "delivering", x: 48, y: 78, speed: "22 km/h", currentStop: "Nguyễn Thị Thập, Tân Phú" },
  { id: "TX-06", name: "Võ Quốc Cường", plate: "59G2-119.82", zone: "Gò Vấp", ordersCount: 14, status: "moving", x: 38, y: 28, speed: "35 km/h", currentStop: "Quang Trung, Phường 10" },
];

export const LiveMapModal: React.FC<LiveMapModalProps> = ({ onClose }) => {
  const [selectedZone, setSelectedZone] = useState<string>("ALL");
  const [activeCourier, setActiveCourier] = useState<SimulatedCourier | null>(INITIAL_COURIERS[0]);
  const [search, setSearch] = useState("");

  const filteredCouriers = INITIAL_COURIERS.filter((c) => {
    const matchesZone = selectedZone === "ALL" || c.zone === selectedZone;
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.plate.toLowerCase().includes(search.toLowerCase());
    return matchesZone && matchesSearch;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="map-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="map-modal-header">
          <div>
            <div className="map-modal-eyebrow">UTE EXPRESS · DISPATCH NETWORK RADAR</div>
            <h2 className="map-modal-title">Bản Đồ Điều Phối Vận Hành Trực Tuyến</h2>
          </div>
          <div className="map-modal-header-actions">
            <span className="live-pill">
              <span className="live-pill__dot" />
              <span>84 tài xế đang hoạt động</span>
            </span>
            <button type="button" className="btn-drawer-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="map-modal-body">
          {/* Map Surface (Vector Radar) */}
          <div className="map-viewport">
            <svg
              className="map-grid-layer"
              width="100%"
              height="100%"
              viewBox="0 0 1000 600"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(226, 232, 240, 0.4)" strokeWidth="0.8" />
                </pattern>
                <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1548E5" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#1548E5" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="100%" height="100%" fill="#f8fafc" />
              <rect width="100%" height="100%" fill="url(#gridPattern)" />

              {/* Hub Conduits / Routes */}
              <path
                d="M 280 288 Q 420 330 720 210"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
              <path
                d="M 420 330 L 550 240 L 720 210"
                fill="none"
                stroke="#1548E5"
                strokeOpacity="0.4"
                strokeWidth="2.5"
              />
              <path
                d="M 420 330 L 480 468"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
              />

              {/* Logistics Hubs */}
              {/* Hub 1: Thủ Đức Mega Hub */}
              <circle cx="720" cy="210" r="42" fill="url(#hubGlow)" />
              <circle cx="720" cy="210" r="8" fill="#1548E5" />
              <text x="735" y="214" fill="#0f172a" fontSize="13" fontWeight="700" fontFamily="sans-serif">
                KHO TỔNG THỦ ĐỨC
              </text>
              <text x="735" y="230" fill="#64748b" fontSize="11" fontFamily="sans-serif">
                Bưu cục trung chuyển chính
              </text>

              {/* Hub 2: Q1 Express Hub */}
              <circle cx="420" cy="330" r="32" fill="url(#hubGlow)" />
              <circle cx="420" cy="330" r="7" fill="#059669" />
              <text x="350" y="360" fill="#0f172a" fontSize="12" fontWeight="700" fontFamily="sans-serif">
                BƯU CỤC QUẬN 1
              </text>

              {/* Hub 3: Bình Thạnh Hub */}
              <circle cx="550" cy="240" r="6" fill="#0284c7" />
              <text x="562" y="244" fill="#334155" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                Trạm Bình Thạnh
              </text>

              {/* Hub 4: Tân Bình Airport Hub */}
              <circle cx="280" cy="288" r="6" fill="#0284c7" />
              <text x="180" y="292" fill="#334155" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                Trạm Tân Bình - Sân Bay
              </text>
            </svg>

            {/* Simulated Live Couriers on Map */}
            {filteredCouriers.map((c) => {
              const isSelected = activeCourier?.id === c.id;
              return (
                <div
                  key={c.id}
                  className={`map-courier-pin${isSelected ? " is-selected" : ""}`}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  onClick={() => setActiveCourier(c)}
                  title={`${c.name} (${c.plate})`}
                >
                  <span className="pin-pulse" />
                  <span className="pin-core">
                    <span className="pin-dot" />
                  </span>
                  <div className="pin-tooltip text-mono">
                    <strong>{c.name}</strong>
                    <span>{c.ordersCount} đơn</span>
                  </div>
                </div>
              );
            })}

            {/* Map HUD Overlay */}
            <div className="map-hud-overlay">
              <div className="hud-pill text-mono">
                <span>Vận tốc TB: <strong>28.4 km/h</strong></span>
                <span>Tỉ lệ đúng hẹn: <strong>94.2%</strong></span>
                <span>Khu vực phủ: <strong>TP. Hồ Chí Minh</strong></span>
              </div>
            </div>
          </div>

          {/* Sidebar Courier List & Telemetry */}
          <div className="map-sidebar">
            <div className="map-sidebar-filter">
              <input
                type="text"
                className="input input-sm"
                placeholder="Tìm tên, biển số xe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="zone-pill-row">
                {["ALL", "Quận 1", "Thủ Đức", "Bình Thạnh", "Tân Bình"].map((z) => (
                  <button
                    key={z}
                    type="button"
                    className={`btn-zone-filter${selectedZone === z ? " is-active" : ""}`}
                    onClick={() => setSelectedZone(z)}
                  >
                    {z === "ALL" ? "Tất cả" : z}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Courier Detail Card */}
            {activeCourier && (
              <div className="selected-courier-card">
                <div className="courier-card-head">
                  <span className="courier-badge">ĐANG CHỌN</span>
                  <span className="courier-status text-mono">{activeCourier.speed}</span>
                </div>
                <strong className="courier-name">{activeCourier.name}</strong>
                <div className="courier-meta text-mono">
                  <span>Mã: {activeCourier.id}</span>
                  <span>Biển số: {activeCourier.plate}</span>
                </div>
                <div className="courier-location">
                  <span className="label">Vị trí hiện tại:</span>
                  <p className="address">{activeCourier.currentStop}</p>
                </div>
                <div className="courier-progress">
                  <span className="label">Tiến độ giao ca:</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.min(100, activeCourier.ordersCount * 7)}%` }}
                    />
                  </div>
                  <span className="count text-mono">{activeCourier.ordersCount} đơn hàng phụ trách</span>
                </div>
              </div>
            )}

            {/* Courier List */}
            <div className="courier-list-scroll">
              <span className="list-title">Danh Sách Tài Xế Ca Hiện Tại ({filteredCouriers.length})</span>
              {filteredCouriers.map((c) => (
                <div
                  key={c.id}
                  className={`courier-item${activeCourier?.id === c.id ? " is-active" : ""}`}
                  onClick={() => setActiveCourier(c)}
                >
                  <div className="courier-item__info">
                    <strong className="name">{c.name}</strong>
                    <span className="plate text-mono">{c.plate} · {c.zone}</span>
                  </div>
                  <div className="courier-item__status">
                    <span className="orders-count text-mono">{c.ordersCount} đơn</span>
                    <span className="status-label">{c.status === "moving" ? "Di chuyển" : "Đang giao"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapModal;

