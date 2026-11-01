import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface TopBarProps {
  title?: string;
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title = "Tổng quan vận chuyển",
  onToggleSidebar,
}) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = user?.full_name?.trim() || "Tài khoản";
  const userInitials = displayName
    .split(/\s+/)
    .map((word) => word[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  const roleLabel = user?.role === "SHIPPER"
    ? "Nhân viên giao hàng"
    : user?.role || "Tài khoản giao nhận";

  return (
    <header className="portal-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="btn-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Mở danh mục điều hướng"
        >
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
        </button>

        <div className="topbar-title-group">
          <h1 className="topbar-title">{title}</h1>
          <span className="topbar-sub">UTE Express · Quản lý giao nhận</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="dropdown-container">
          <button
            type="button"
            className="user-profile-pill"
            onClick={() => setShowUserMenu((visible) => !visible)}
            aria-label="Tài khoản cá nhân"
            aria-expanded={showUserMenu}
          >
            <span className="user-avatar-circle">{userInitials || "U"}</span>
            <span className="user-info-text">
              <strong className="user-name">{displayName}</strong>
              <span className="user-role">{roleLabel}</span>
            </span>
          </button>

          {showUserMenu && (
            <div className="dropdown-popover user-menu-popover">
              <div className="user-menu-header">
                <strong>{displayName}</strong>
                <span className="user-menu-role">{roleLabel}</span>
              </div>
              <div className="user-menu-links">
                <Link
                  to="/profile"
                  className="user-menu-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  Thông tin tài khoản
                </Link>
                <Link
                  to="/reconciliation"
                  className="user-menu-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  Đối soát tiền COD
                </Link>
              </div>
              <div className="user-menu-footer">
                <button type="button" className="btn-logout" onClick={logout}>
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
