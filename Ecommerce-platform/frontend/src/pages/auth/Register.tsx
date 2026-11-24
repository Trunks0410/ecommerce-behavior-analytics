import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import ReCAPTCHA from "react-google-recaptcha";
import { useGoogleLogin } from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { publicAxios } from "@/shared/api/axiosClient";
import { googleLoginThunk } from "@/app/stores/slices/authSlice";
import type { AppDispatch } from "@/app/stores/store";
import { cartService } from "@/services/cartService";

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      setLoading(true);
      try {
        const result = await dispatch(
          googleLoginThunk(tokenResponse.access_token),
        );
        if (googleLoginThunk.fulfilled.match(result)) {
          const token = result.payload.accessToken;
          await cartService.syncGuestCart(token);
          queryClient.invalidateQueries({ queryKey: ["cart"] });
          navigate("/", { replace: true });
        } else {
          setError((result.payload as string) || "Đăng ký bằng Google thất bại!");
        }
      } catch (err: any) {
        setError("Không thể kết nối máy chủ khi đăng ký Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error("Google Register Failed:", err);
      setError("Đăng ký Google thất bại hoặc đã bị hủy. Vui lòng kiểm tra lại Google Client ID.");
    },
  });

  const onClickGoogleRegister = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID") {
      setError(
        "Chưa cấu hình VITE_GOOGLE_CLIENT_ID trong file Ecommerce-platform/frontend/.env. Vui lòng cập nhật Google Client ID mới."
      );
      return;
    }
    setError("");
    handleGoogleRegister();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirm_password) {
      setError("Mật khẩu nhập lại không khớp!");
      return;
    }

    if (!recaptchaToken) {
      setError("Vui lòng xác thực reCAPTCHA!");
      return;
    }

    setLoading(true);
    try {
      const response = await publicAxios.post("/auth/register", {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        fullName: formData.fullName,
        recaptchaToken: recaptchaToken,
      });

      if (response.status === 201 || response.status === 200) {
        alert("Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.");
        navigate(`/auth/verify-otp?email=${formData.email}`);
      } else {
        setError(response.data.message || "Đăng ký thất bại!");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Không thể kết nối đến server. Vui lòng thử lại sau!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh md:h-dvh md:overflow-hidden flex items-center justify-center bg-[#faf9f6] px-4 py-3 sm:px-6">
      <main className="w-full max-w-5xl flex flex-col md:flex-row gap-6 lg:gap-8 items-stretch justify-center">
        {/* Left Side - Image */}
        <div className="w-full md:w-[46%] relative hidden md:block">
          <div className="card-brutal p-0 overflow-hidden bg-[#e6e2db] h-full max-h-[calc(100dvh-2rem)] relative border-[3px]">
            <div className="absolute top-6 left-6 bg-white px-5 py-3 border-2 border-black shadow-brutal z-10">
              <h3 className="font-serif italic text-lg font-bold">
                Better Everyday Shopping
              </h3>
              <p className="text-[10px] font-bold tracking-widest uppercase mt-0.5">
                MEEMART MARKETPLACE
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1000&auto=format&fit=crop"
              alt="Marketplace lifestyle"
              className="w-full h-full object-cover mix-blend-multiply"
            />
            <div className="absolute bottom-6 left-6 right-6 bg-black text-white p-6 border-2 border-white">
              <p className="font-serif italic text-base lg:text-lg mb-3 leading-relaxed">
                "Mua sắm đúng nơi, đúng nhu cầu, đúng giá — mỗi lần đặt hàng đều dễ dàng hơn."
              </p>
              <p className="text-[10px] font-bold tracking-widest uppercase">
                — MEEMART MARKETPLACE
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-[54%] flex flex-col justify-center">
          <Card className="p-5 sm:p-6 rounded-xs sm:rounded-sm shadow-sm">
            <div className="mb-4">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-1">
                Tạo tài khoản
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm">
                Tham gia cộng đồng MeeMart để nhận ưu đãi đặc quyền và hàng ngàn deal mới mỗi ngày.
              </p>
            </div>

            {error && (
              <div className="mb-3 p-2.5 bg-red-100 border-l-4 border-red-500 text-red-700 text-xs font-bold">
                {error}
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input
                label="Họ và tên"
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                value={formData.fullName}
                onChange={handleChange}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Địa chỉ email"
                  id="email"
                  type="email"
                  placeholder="example@meemart.vn"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Số điện thoại"
                  id="phone"
                  type="tel"
                  placeholder="0123456789"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mật khẩu"
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Nhập lại"
                  id="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="flex justify-center pt-1">
                <div className="scale-[0.88] origin-center -my-1">
                  <ReCAPTCHA
                    sitekey="6LfKIuYsAAAAAJz_47Qvah7gjvrtOkgbOm5sjFLT"
                    onChange={handleRecaptchaChange}
                  />
                </div>
              </div>

              <Button
                className="w-full uppercase tracking-wider rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                type="submit"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Tạo tài khoản"}
              </Button>
            </form>

            <div className="mt-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute border-t border-gray-300 w-full"></div>
                <span className="bg-white px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest relative">
                  HOẶC ĐĂNG KÝ NHANH BẰNG
                </span>
              </div>

              <button
                type="button"
                onClick={onClickGoogleRegister}
                disabled={loading}
                className="w-full mt-3 flex items-center justify-center space-x-2 border-2 border-black py-2.5 px-4 hover:bg-primary hover:text-white transition-all bg-white font-bold text-sm rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                <span>Tiếp tục với Google</span>
              </button>
            </div>

            <div className="mt-4 text-center pt-3 border-t border-gray-200">
              <p className="text-xs sm:text-sm">
                Đã có tài khoản?{" "}
                <Link
                  to="/auth/login"
                  className="font-bold text-primary hover:underline"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Register;
