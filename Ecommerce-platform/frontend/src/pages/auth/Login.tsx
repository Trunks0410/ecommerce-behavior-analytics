import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { loginThunk, googleLoginThunk } from "@/app/stores/slices/authSlice";
import type { AppDispatch } from "@/app/stores/store";
import useAuth from "@/hooks/useAuth";
import { useGoogleLogin } from "@react-oauth/google";
import { cartService } from "@/services/cartService";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { store } from "@/app/stores/store";
import { sanitizeRedirectUrl } from "@/shared/utils/redirectUtils";

const Login = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { loading, error, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email_or_phone: "",
    password: "",
  });
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Nếu đã đăng nhập từ trước → chuyển trang theo vai trò
  useEffect(() => {
    const isAuth = store.getState().auth.isAuthenticated;
    if (isAuth) {
      const user = store.getState().auth.user;
      const roleName = typeof user?.role === "string"
        ? user.role.toLowerCase()
        : user?.role?.role_name?.toLowerCase();

      if (roleName === "admin") {
        navigate("/admin", { replace: true });
      } else if (roleName === "vendor") {
        navigate("/vendor", { replace: true });
      } else if (roleName === "shipper") {
        window.location.href = import.meta.env.VITE_SHIPPER_PORTAL_URL || "http://localhost:5174";
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  const getRedirectUrl = (payload: any) => {
    const params = new URLSearchParams(location.search);
    const customRedirect = params.get("redirect");
    if (customRedirect) return sanitizeRedirectUrl(customRedirect, "/");

    const user = payload.user;
    const roleName = typeof user?.role === "string" 
      ? user.role.toLowerCase() 
      : user?.role?.role_name?.toLowerCase();

    if (roleName === "admin") return "/admin";
    if (roleName === "vendor") return "/vendor";
    if (roleName === "shipper") {
      window.location.href = import.meta.env.VITE_SHIPPER_PORTAL_URL || "http://localhost:5174";
      return "/";
    }

    return sanitizeRedirectUrl(payload.redirectUrl, "/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email_or_phone || !formData.password) return;

    const result = await dispatch(
      loginThunk({
        email_or_phone: formData.email_or_phone,
        password: formData.password,
      }),
    );

    // Sau khi login thành công, navigate theo redirectUrl từ backend
    if (loginThunk.fulfilled.match(result)) {
      const token = result.payload.accessToken;
      await cartService.syncGuestCart(token);
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      const redirectUrl = getRedirectUrl(result.payload);
      navigate(sanitizeRedirectUrl(redirectUrl, "/"), { replace: true });
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleError(null);
      const result = await dispatch(
        googleLoginThunk(tokenResponse.access_token),
      );
      if (googleLoginThunk.fulfilled.match(result)) {
        const token = result.payload.accessToken;
        await cartService.syncGuestCart(token);
        queryClient.invalidateQueries({ queryKey: ["cart"] });

        const redirectUrl = getRedirectUrl(result.payload);
        navigate(sanitizeRedirectUrl(redirectUrl, "/"), { replace: true });
      }
    },
    onError: (err) => {
      console.error("Google Login Failed:", err);
      setGoogleError("Đăng nhập Google thất bại hoặc đã bị hủy. Vui lòng kiểm tra lại cấu hình Google Client ID.");
    },
  });

  const onClickGoogleButton = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID") {
      setGoogleError(
        "Chưa cấu hình VITE_GOOGLE_CLIENT_ID trong file Ecommerce-platform/frontend/.env. Vui lòng cập nhật Google Client ID mới."
      );
      return;
    }
    setGoogleError(null);
    handleGoogleLogin();
  };

  return (
    <div className="min-h-dvh md:h-dvh md:overflow-hidden flex items-center justify-center bg-[#faf9f6] px-4 py-4 sm:px-6">
      <main className="w-full max-w-5xl flex flex-col md:flex-row gap-6 lg:gap-8 items-center justify-center">
        {/* Left Side - Image */}
        <div className="w-full md:w-1/2 relative hidden md:block">
          <div className="card-brutal p-0 overflow-hidden bg-[#d2bba3] h-[560px] max-h-[calc(100dvh-2.5rem)] relative">
            <img
              src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1000&auto=format&fit=crop"
              alt="Marketplace Editorial"
              className="w-full h-full object-cover opacity-90 mix-blend-multiply"
            />
            <div className="absolute bottom-6 left-6 right-6 bg-white p-6 border-[3px] border-black shadow-brutal">
              <p className="font-serif italic text-lg lg:text-xl mb-3 leading-relaxed text-gray-900">
                "Mua sắm thông minh là cách bạn tối ưu thời gian, chi phí và trải nghiệm mỗi ngày."
              </p>
              <p className="text-xs font-bold tracking-widest uppercase text-gray-800">
                — MEEMART MARKETPLACE
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-[440px]">
          <Card className="p-6 sm:p-8 rounded-xs sm:rounded-sm shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="font-serif text-3xl font-bold mb-2">
                Đăng nhập MeeMart
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm">
                Chào mừng bạn quay trở lại. Hãy đăng nhập để tiếp tục trải
                nghiệm mua sắm.
              </p>
            </div>

            {/* Error Message */}
            {(error || googleError) && (
              <div className="mb-4 p-2.5 bg-red-50 border-2 border-red-400 text-red-700 text-xs sm:text-sm font-medium">
                {googleError || error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Email hoặc số điện thoại"
                id="email_or_phone"
                type="text"
                placeholder="example@gmail.com"
                value={formData.email_or_phone}
                onChange={handleChange}
                disabled={loading}
              />

              <Input
                label="Mật khẩu"
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />

              <div className="flex items-center justify-end">
                <Link
                  to="/auth/forgot-password"
                  className="text-xs sm:text-sm font-bold hover:text-primary transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full flex justify-center items-center gap-2 rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    Đăng nhập <span className="text-xl leading-none">→</span>
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5">
              <div className="relative flex items-center justify-center">
                <div className="absolute border-t border-gray-300 w-full"></div>
                <span className="bg-white px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest relative">
                  HOẶC ĐĂNG NHẬP BẰNG
                </span>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={onClickGoogleButton}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 border-2 border-black py-2.5 px-4 hover:bg-primary hover:text-white transition-all bg-white font-bold text-sm rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  <span>Tiếp tục với Google</span>
                </button>
              </div>
            </div>

            <p className="text-center mt-6 text-xs sm:text-sm">
              Chưa có tài khoản?{" "}
              <Link
                to="/auth/register"
                className="font-bold text-primary hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
