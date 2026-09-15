import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { UserPlus, Gift, Crown } from "lucide-react";
import { publicAxios } from "@/shared/api/axiosClient";

const Register = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen flex flex-col bg-[#faf9f6]">
      <main className="flex-grow flex flex-col items-center p-6 mt-10">
        <div className="max-w-6xl w-full flex flex-col md:flex-row gap-8">
          {/* Left Side - Image */}
          <div className="w-full md:w-1/2 relative hidden md:block">
            <div className="card-brutal p-0 overflow-hidden bg-[#e6e2db] h-full relative border-[3px]">
              <div className="absolute top-8 left-8 bg-white px-6 py-4 border-2 border-black shadow-brutal z-10">
                <h3 className="font-serif italic text-xl font-bold">
                  New Era of Style
                </h3>
                <p className="text-[10px] font-bold tracking-widest uppercase mt-1">
                  COLLECTION 2024
                </p>
              </div>
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop"
                alt="Fashion Models"
                className="w-full h-full object-cover mix-blend-multiply"
              />
              <div className="absolute bottom-10 left-10 right-10 bg-black text-white p-8 border-2 border-white">
                <p className="font-bold text-lg mb-4 leading-relaxed">
                  "Thời trang không chỉ là những gì bạn mặc, mà là cách bạn
                  khẳng định cá tính riêng biệt."
                </p>
                <p className="text-[10px] font-bold tracking-widest uppercase">
                  — UTESHOP EDITORIAL
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            <Card className="p-10 mb-8 rounded-xl">
              <div className="mb-8">
                <h1 className="font-serif text-4xl font-bold mb-3">
                  Tạo tài khoản
                </h1>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Tham gia cộng đồng UTEShop để nhận những ưu đãi đặc quyền và
                  bộ sưu tập mới nhất.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm font-bold">
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <Input
                  label="Họ và tên"
                  id="fullName"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Địa chỉ email"
                    id="email"
                    type="email"
                    placeholder="example@uteshop.vn"
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="mt-4 flex justify-center">
                  <ReCAPTCHA
                    sitekey="6LfKIuYsAAAAAJz_47Qvah7gjvrtOkgbOm5sjFLT"
                    onChange={handleRecaptchaChange}
                  />
                </div>

                <Button
                  className="w-full mt-6 uppercase tracking-wider rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : "Tạo tài khoản"}
                </Button>
              </form>

              <div className="mt-8 text-center pt-6 border-t border-gray-200">
                <p className="text-sm">
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

            <div className="flex justify-between px-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">• BẢO MẬT 256-BIT</span>
              <span className="flex items-center gap-1">• HỖ TRỢ 24/7</span>
              <span className="flex items-center gap-1">• ĐỔI TRẢ 30 NGÀY</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 mb-10">
          <Card className="p-8">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6">
              <UserPlus size={24} />
            </div>
            <h3 className="font-serif text-xl font-bold mb-3">
              Thành viên mới
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Giảm ngay 10% cho đơn hàng đầu tiên sau khi đăng ký thành công tài
              khoản UTEShop.
            </p>
          </Card>

          <Card className="p-8">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6">
              <Gift size={24} />
            </div>
            <h3 className="font-serif text-xl font-bold mb-3">
              Tích điểm đổi quà
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Mỗi lượt mua sắm là một cơ hội tích lũy điểm thưởng để nâng hạng
              thành viên Diamond.
            </p>
          </Card>

          <Card className="p-8">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6">
              <Crown size={24} />
            </div>
            <h3 className="font-serif text-xl font-bold mb-3">Quyền lợi VIP</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ưu tiên mua sắm các bộ sưu tập Limited và tham gia các sự kiện
              thời trang độc quyền.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Register;
