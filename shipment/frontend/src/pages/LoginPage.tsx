import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Truck, Lock, Phone, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!emailOrPhone || !password) {
      setError("Vui lòng nhập đầy đủ thông tin đăng nhập!");
      return;
    }

    try {
      setLoading(true);
      await login(emailOrPhone, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoAccount: string) => {
    setEmailOrPhone(demoAccount);
    setPassword("123456");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
      color: "#ffffff"
    }}>
      <div style={{
        maxWidth: "440px",
        width: "100%",
        background: "rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(16px)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "2.5rem 2rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "1rem",
            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.4)"
          }}>
            <Truck size={32} />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
            UTE Express Partner
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.25rem" }}>
            Cổng điều phối & giao nhận (Shipment Microservice)
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.5rem" }}>
              Số điện thoại hoặc Email
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="input"
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  paddingLeft: "2.5rem"
                }}
                placeholder="Nhập email hoặc số điện thoại..."
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
              />
              <Phone size={18} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.5rem" }}>
              Mật khẩu
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                className="input"
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  paddingLeft: "2.5rem"
                }}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={18} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ marginTop: "0.5rem", width: "100%", gap: "0.5rem" }}
          >
            {loading ? "Đang xác thực..." : "Đăng nhập Shipper"}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Demo Accounts Pill */}
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", marginBottom: "0.75rem", fontWeight: 600 }}>
            TÀI KHOẢN SHIPPER THỬ NGHIỆM:
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleFillDemo("shipper@gmail.com")}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#e2e8f0",
                padding: "0.375rem 0.75rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              shipper@gmail.com
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo("shipper1@gmail.com")}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#e2e8f0",
                padding: "0.375rem 0.75rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              shipper1@gmail.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
