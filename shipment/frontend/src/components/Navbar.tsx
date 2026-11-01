import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navLinks = [
  { to: "/", label: "Tổng quan" },
  { to: "/orders", label: "Đơn giao hàng" },
  { to: "/reconciliation", label: "Đối soát COD" },
  { to: "/profile", label: "Hồ sơ cá nhân" },
];

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-brand" onClick={closeMenu} aria-label="UTE Express, về tổng quan">
          <img className="site-brand__logo" src="/logo-ute-express.png" alt="UTE Express" />
        </Link>

        <button
          type="button"
          className="site-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          {menuOpen ? "Đóng" : "Menu"}
        </button>

        <div id="primary-navigation" className={`site-header__navigation${menuOpen ? " is-open" : ""}`}>
          <nav className="site-nav" aria-label="Điều hướng chính">
            <span className="site-nav__label">ĐIỀU HƯỚNG</span>
            {navLinks.map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMenu}
                  className={`site-nav__link${isActive ? " is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="site-account">
            <span className="site-account__label">TÀI KHOẢN</span>
            <div className="site-account__identity">
              <strong>{user?.full_name || user?.email}</strong>
              <span>Đối tác giao nhận</span>
            </div>
            <span className="site-account__divider" />
            <button type="button" className="site-account__logout" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
