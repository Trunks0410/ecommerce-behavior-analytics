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
      } else if (roleName === "manager") {
        navigate("/manager", { replace: true });
      } else if (roleName === "vendor") {
        navigate("/vendor", { replace: true });
      } else if (roleName === "shipper") {
        navigate("/shipper", { replace: true });
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
    if (customRedirect) return customRedirect;

    const user = payload.user;
    const roleName = typeof user?.role === "string" 
      ? user.role.toLowerCase() 
      : user?.role?.role_name?.toLowerCase();

    if (roleName === "admin") return "/admin";
    if (roleName === "manager") return "/manager";
    if (roleName === "vendor") return "/vendor";
    if (roleName === "shipper") return "/shipper";

    return payload.redirectUrl || "/";
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
      navigate(redirectUrl.startsWith("/") ? redirectUrl : `/${redirectUrl}`, { replace: true });
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const result = await dispatch(
        googleLoginThunk(tokenResponse.access_token),
      );
      if (googleLoginThunk.fulfilled.match(result)) {
        const token = result.payload.accessToken;
        await cartService.syncGuestCart(token);
        queryClient.invalidateQueries({ queryKey: ["cart"] });

        const redirectUrl = getRedirectUrl(result.payload);
        navigate(redirectUrl.startsWith("/") ? redirectUrl : `/${redirectUrl}`, { replace: true });
      }
    },
    onError: () => console.log("Google Login Failed"),
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6]">
      <main className="flex-grow flex items-center justify-center p-6 mt-10">
        <div className="max-w-6xl w-full flex flex-col md:flex-row gap-8 items-center justify-center">
          {/* Left Side - Image */}
          <div className="w-full md:w-1/2 relative">
            <div className="card-brutal p-0 overflow-hidden bg-[#d2bba3] aspect-[4/5] relative">
              <img
                src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop"
                alt="Fashion Editorial"
                className="w-full h-full object-cover opacity-90 mix-blend-multiply"
              />
              <div className="absolute bottom-10 left-10 right-10 bg-white p-8 border-[3px] border-black shadow-brutal">
                <p className="font-serif italic text-xl mb-4 leading-relaxed">
                  "Thời trang không chỉ là quần áo, đó là cách bạn kể câu chuyện
                  của chính mình."
                </p>
                <p className="text-xs font-bold tracking-widest uppercase">
                  — UTESHOP EDITORIAL
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="w-full md:w-[450px]">
            <Card className="p-10 rounded-xl">
              <div className="mb-10 text-center">
                <h1 className="font-serif text-4xl font-bold mb-3">
                  Đăng nhập UTEShop
                </h1>
                <p className="text-gray-600 text-sm">
                  Chào mừng bạn quay trở lại. Hãy đăng nhập để tiếp tục trải
                  nghiệm mua sắm.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
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

                <div className="flex items-center justify-end mt-4">
                  <Link
                    to="/auth/forgot-password"
                    className="text-sm font-bold hover:text-primary transition-colors"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-8 flex justify-center items-center gap-2 rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
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

              <div className="mt-8">
                <div className="relative flex items-center justify-center">
                  <div className="absolute border-t border-gray-300 w-full"></div>
                  <span className="bg-white px-4 text-xs font-bold text-gray-500 uppercase tracking-widest relative">
                    HOẶC ĐĂNG NHẬP BẰNG
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin()}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 border-2 border-black py-3 px-4 hover:bg-primary hover:text-white transition-all bg-white font-bold text-sm rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt="Google"
                      className="w-5 h-5"
                    />
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center space-x-2 border-2 border-black py-3 px-4 hover:shadow-brutal transition-all bg-white font-bold text-sm rounded-lg opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <img
                      src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                      alt="Facebook"
                      className="w-5 h-5"
                    />
                    <span>Facebook</span>
                  </button>
                </div>
              </div>

              <p className="text-center mt-10 text-sm">
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
        </div>
      </main>
    </div>
  );
};

export default Login;
