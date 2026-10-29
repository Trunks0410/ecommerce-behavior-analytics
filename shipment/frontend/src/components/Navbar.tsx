import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Truck,
  LayoutDashboard,
  Package,
  DollarSign,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Tổng quan", icon: LayoutDashboard },
    { to: "/orders", label: "Đơn giao hàng", icon: Package },
    { to: "/reconciliation", label: "Đối soát COD", icon: DollarSign },
    { to: "/profile", label: "Hồ sơ cá nhân", icon: User },
  ];

  return (
    <header style={{
      background: "#ffffff",
      borderBottom: "1px solid var(--color-border)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "4.5rem" }}>
        {/* Logo & Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
            <div style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.75rem",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 6px -1px rgba(37,99,235,0.25)"
            }}>
              <Truck size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.025em" }}>
                  UTE EXPRESS
                </span>
                <span style={{
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  background: "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  padding: "0.125rem 0.375rem",
                  borderRadius: "9999px"
                }}>
                  SERVICE
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                Shipper Delivery Portal
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="desktop-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.875rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  backgroundColor: isActive ? "var(--color-primary-light)" : "transparent",
                  color: isActive ? "var(--color-primary)" : "var(--color-text-main)",
                }}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Area: Profile Badge & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {user && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "#f8fafc",
              border: "1px solid var(--color-border)",
              padding: "0.375rem 0.75rem 0.375rem 0.5rem",
              borderRadius: "9999px"
            }}>
              <div style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: "#dbeafe",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.875rem",
                overflow: "hidden"
              }}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (user.full_name || user.email)[0].toUpperCase()
                )}
              </div>
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                  {user.full_name || user.email}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: "var(--color-success)", fontWeight: 600 }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-success)" }} />
                  Đang hoạt động
                </div>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="btn btn-outline btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
            title="Đăng xuất"
          >
            <LogOut size={14} />
            <span className="logout-text">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
