import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Mail, ArrowRight } from "lucide-react";
import { publicAxios } from "@/shared/api/axiosClient";

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate("/auth/register");
    }
  }, [email, navigate]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.slice(0, 6).split("");
      const newValues = [...otpValues];
      pastedData.forEach((char, i) => {
        if (index + i < 6) newValues[index + i] = char;
      });
      setOtpValues(newValues);
      
      // Focus last filled or next empty
      const nextIndex = Math.min(index + pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);

    // Auto-focus next input
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otpValues[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullOtp = otpValues.join("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await publicAxios.post("/auth/verify-otp", {
        email,
        otpCode: fullOtp,
      });

      if (response.status === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/auth/login");
        }, 3000);
      } else {
        setError(response.data.message || "Xác thực thất bại!");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Không thể kết nối đến server. Vui lòng thử lại sau!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6]">
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="card-modern p-10">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-transform hover:-translate-y-1">
                <Mail size={32} />
              </div>
              <h1 className="font-serif text-3xl font-bold mb-3">
                Xác thực tài khoản
              </h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                Chúng tôi đã gửi mã OTP đến email <br />
                <span className="font-bold text-slate-900 underline decoration-2">{email}</span>. <br />
                Vui lòng nhập mã để kích hoạt tài khoản.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 text-red-700 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] rounded-xl">
                {error}
              </div>
            )}

            {success ? (
              <div className="text-center py-8">
                <div className="mb-4 text-green-600 font-bold text-2xl uppercase tracking-widest">
                  Xác thực thành công!
                </div>
                <p className="text-gray-600 mb-6 font-medium">
                  Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng đến
                  trang đăng nhập...
                </p>
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="flex justify-between gap-2">
                  {otpValues.map((value, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={value}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-16 text-center text-2xl font-black bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,0.15)] transition-all duration-300 hover:border-slate-300"
                      required
                    />
                  ))}
                </div>

                <button
                  className="btn-auth-modern w-full h-14"
                  type="submit"
                  disabled={loading || fullOtp.length !== 6}
                >
                  {loading ? "ĐANG XÁC THỰC..." : "KÍCH HOẠT TÀI KHOẢN"}
                </button>

                <div className="text-center mt-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Mã OTP có hiệu lực trong 15 phút.
                  </p>
                  <button
                    type="button"
                    className="text-xs font-black text-black mt-2 hover:underline uppercase tracking-tighter"
                    onClick={() => alert("Chức năng gửi lại mã đang phát triển")}
                  >
                    Gửi lại mã xác thực
                  </button>
                </div>
              </form>
            )}

            <div className="mt-10 text-center pt-8 border-t-2 border-slate-200 border-dashed">
              <button
                onClick={() => navigate("/auth/register")}
                className="text-xs font-black text-gray-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-2 mx-auto uppercase tracking-widest"
              >
                <ArrowRight size={14} className="rotate-180" /> Quay lại đăng ký
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyOTP;
