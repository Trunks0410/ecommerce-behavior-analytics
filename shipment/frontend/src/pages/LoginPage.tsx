import React, { useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!emailOrPhone.trim() || !password) {
      setError("Vui lòng nhập email/số điện thoại và mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      await login(emailOrPhone.trim(), password);
      navigate("/", { replace: true });
    } catch (loginError) {
      if (axios.isAxiosError(loginError) && !loginError.response) {
        setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.");
      } else if (axios.isAxiosError(loginError) && loginError.response?.status === 400) {
        setError("Email/số điện thoại hoặc mật khẩu chưa chính xác.");
      } else {
        setError("Đăng nhập chưa thành công. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen-wrapper">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-brand">
          <img
            src="/logo-ute-express.png"
            alt="UTE Express"
            className="login-brand-logo"
          />
          <span className="login-brand-caption">Hệ thống vận chuyển</span>
        </div>

        <div className="login-card-head">
          <h1 className="login-heading" id="login-heading">Đăng nhập</h1>
          <p className="login-subheading">
            Đăng nhập để quản lý đơn hàng và ca giao nhận của bạn.
          </p>
        </div>

        {error && (
          <div className="login-error" id="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form-inner">
          <div className="login-form-group">
            <label className="login-form-label" htmlFor="identity">
              Email hoặc số điện thoại
            </label>
            <input
              id="identity"
              type="text"
              className="login-input"
              placeholder="Nhập email hoặc số điện thoại"
              value={emailOrPhone}
              onChange={(event) => setEmailOrPhone(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <div className="login-form-group">
            <label className="login-form-label" htmlFor="password">Mật khẩu</label>
            <div className="login-password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <footer className="login-card-footer">
          <p>Cần hỗ trợ đăng nhập?</p>
          <a href="tel:1900xxxx">Liên hệ bộ phận điều hành · 1900 xxxx</a>
        </footer>
      </section>
    </main>
  );
};

export default LoginPage;
