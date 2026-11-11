import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Store,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { loginThunk, logout } from '@/app/stores/slices/authSlice';
import type { AppDispatch } from '@/app/stores/store';
import { store } from '@/app/stores/store';

export const AdminLoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal chọn không gian quản trị sau khi đăng nhập thành công
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [savedToken, setSavedToken] = useState<string>('');

  // Nếu đã đăng nhập với quyền Admin, cho phép chọn không gian làm việc
  useEffect(() => {
    const isAuth = store.getState().auth.isAuthenticated;
    if (isAuth) {
      const user = store.getState().auth.user;
      const roleName =
        typeof user?.role === 'string'
          ? user.role.toLowerCase()
          : user?.role?.role_name?.toLowerCase();

      if (roleName === 'admin') {
        const token = store.getState().auth.accessToken || '';
        setSavedToken(token);
        setShowWorkspaceModal(true);
      }
    }
  }, [navigate]);

  const handleLogoutAdmin = () => {
    dispatch(logout());
    setShowWorkspaceModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!emailOrPhone.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin tài khoản và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const result = await dispatch(
        loginThunk({
          email_or_phone: emailOrPhone.trim(),
          password,
        })
      );

      if (loginThunk.fulfilled.match(result)) {
        const user = result.payload.user;
        const roleName =
          typeof user?.role === 'string'
            ? user.role.toLowerCase()
            : user?.role?.role_name?.toLowerCase();

        if (roleName !== 'admin') {
          setErrorMsg('Tài khoản này không có quyền Quản trị viên (Admin).');
          return;
        }

        const token = result.payload.accessToken || '';
        setSavedToken(token);
        setShowWorkspaceModal(true);
      } else {
        setErrorMsg((result.payload as string) || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối cổng xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToEcommerceAdmin = () => {
    const params = new URLSearchParams(location.search);
    const redirectUrl = params.get('redirect') || '/admin';
    navigate(redirectUrl, { replace: true });
  };

  const handleGoToAnalyticsDashboard = () => {
    const targetUrl = `http://localhost:5175${savedToken ? `?token=${encodeURIComponent(savedToken)}` : ''}`;
    window.location.href = targetUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans antialiased">
      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Về trang chủ MeeMart</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Shield size={14} className="text-slate-600" />
          <span>Cổng bảo mật nội bộ</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-sm mb-1">
              <Shield size={22} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Đăng nhập Quản trị viên
            </h1>
            <p className="text-xs text-slate-500">
              Nhập tài khoản định danh để truy cập bảng điều khiển hệ thống MeeMart
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identity field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Email hoặc số điện thoại
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="admin@meemart.com"
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                    autoComplete="username"
                    required
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Mật khẩu
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                    autoComplete="current-password"
                    required
                  />
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:translate-y-[1px]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang đăng nhập...
                  </span>
                ) : (
                  <span>Đăng nhập</span>
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-6 text-xs text-slate-400">
            Hệ sinh thái thương mại điện tử MeeMart © 2026
          </div>
        </div>
      </main>

      {/* MODAL LỰA CHỌN KHÔNG GIAN QUẢN TRỊ (WORKSPACE SELECTOR) */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-xl space-y-6 text-slate-900">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Xác thực thành công</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Lựa chọn không gian quản trị
              </h2>
              <p className="text-xs text-slate-500">
                Tài khoản <span className="font-semibold text-slate-900">admin@meemart.com</span> có toàn quyền quản trị. Vui lòng chọn bảng điều khiển bạn muốn làm việc:
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: E-Commerce Admin */}
              <div
                onClick={handleGoToEcommerceAdmin}
                className="group p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Quản Trị Sàn Thương Mại Điện Tử MeeMart
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quản lý người dùng, duyệt gian hàng, đối soát đơn hàng và đối tác vận chuyển UTE Express
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>

              {/* Option 2: Behavior Analytics & AI Platform */}
              <div
                onClick={handleGoToAnalyticsDashboard}
                className="group p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Phân Tích Hành Vi & Gợi Ý Sản Phẩm
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Giám sát luồng sự kiện realtime, phễu chuyển đổi và cấu hình thuật toán gợi ý
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
              <span>Bạn có thể chuyển đổi linh hoạt bất kỳ lúc nào</span>
              <button
                type="button"
                onClick={handleLogoutAdmin}
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoginPage;
