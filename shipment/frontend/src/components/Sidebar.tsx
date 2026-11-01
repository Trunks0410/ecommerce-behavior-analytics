import React from "react";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: "/", label: "Tổng quan" },
  { to: "/orders", label: "Vận đơn" },
  { to: "/reconciliation", label: "Đối soát & COD" },
  { to: "/profile", label: "Cài đặt & Hồ sơ" },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`portal-sidebar${isOpen ? " is-open" : ""}`} aria-label="Điều hướng chính">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <Link to="/" className="brand-link" onClick={onClose}>
            <img
              src="/logo-ute-express.png"
              alt="UTE Express - Dịch vụ vận chuyển"
              className="brand-logo-img"
            />
          </Link>
          <div className="brand-meta">
            <span className="brand-subtitle">Hệ thống vận chuyển</span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="sidebar-nav-section">
          <span className="nav-eyebrow">DANH MỤC</span>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`sidebar-nav-item${isActive ? " is-active" : ""}`}
                  onClick={onClose}
                >
                  <span className="nav-text">{item.label}</span>
                  <span className="nav-indicator" />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-support">
          <span className="support-title">Cần hỗ trợ?</span>
          <p className="support-desc">
            Liên hệ bộ phận điều hành khi cần hỗ trợ giao nhận.
          </p>
          <a href="tel:19002882" className="support-hotline text-mono">
            Hotline: 1900 xxxx
          </a>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
