import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import usePasswordRecovery from "@/hooks/usePasswordRecovery";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const recovery = usePasswordRecovery();

  // Step 1: Email input
  const [emailInput, setEmailInput] = useState("");

  // Step 2: OTP input
  const [otpInput, setOtpInput] = useState("");

  // Step 3: Password reset
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      return;
    }
    await recovery.sendOtp(emailInput);
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      return;
    }
    await recovery.verifyOtp(otpInput);
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      return;
    }
    const success = await recovery.resetPassword(newPassword, confirmPassword);
    if (success) {
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth/login");
      }, 2000);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    await recovery.resendOtp();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6]">
      <main className="flex-grow flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 mt-10 rounded-xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-black text-white flex items-center justify-center">
              <ShieldCheck size={32} />
            </div>
          </div>

          {/* Step 1: Email Input */}
          {recovery.currentStep === "email" && (
            <>
              <div className="text-center mb-8">
                <h1 className="font-serif text-3xl font-bold mb-4">
                  Khôi phục mật khẩu
                </h1>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Đừng lo lắng, chuyện này thường xuyên xảy ra. Nhập email của
                  bạn bên dưới để nhận liên kết khôi phục tài khoản.
                </p>
              </div>

              {recovery.error && (
                <div className="mb-6 flex gap-3 p-4 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-sm text-red-600">{recovery.error}</p>
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-6">
                <Input
                  label="Địa chỉ email"
                  id="email"
                  type="email"
                  placeholder="example@uteshop.vn"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={recovery.loading}
                />

                <Button
                  className="w-full uppercase tracking-wider rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  disabled={recovery.loading || !emailInput.trim()}
                >
                  {recovery.loading ? "Đang gửi..." : "Gửi liên kết"}
                </Button>
              </form>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {recovery.currentStep === "otp" && (
            <>
              <div className="text-center mb-8">
                <h1 className="font-serif text-3xl font-bold mb-4">
                  Xác thực OTP
                </h1>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Chúng tôi đã gửi mã OTP 6 chữ số đến <strong>{recovery.email}</strong>
                </p>
              </div>

              {recovery.successMessage && (
                <div className="mb-6 flex gap-3 p-4 bg-green-50 border border-green-200 rounded">
                  <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
                  <p className="text-sm text-green-600">{recovery.successMessage}</p>
                </div>
              )}

              {recovery.error && (
                <div className="mb-6 flex gap-3 p-4 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-sm text-red-600">{recovery.error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <Input
                  label="Mã OTP"
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={recovery.loading}
                  maxLength={6}
                />

                <Button
                  className="w-full uppercase tracking-wider rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  disabled={recovery.loading || otpInput.length !== 6}
                >
                  {recovery.loading ? "Đang xác thực..." : "Xác thực OTP"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <p className="text-gray-600 mb-3">Chưa nhận được mã?</p>
                <button
                  onClick={handleResendOtp}
                  disabled={recovery.loading}
                  className="text-primary font-bold hover:underline disabled:opacity-50"
                >
                  Gửi lại OTP
                </button>
              </div>
            </>
          )}

          {/* Step 3: Reset Password */}
          {recovery.currentStep === "reset-password" && (
            <>
              <div className="text-center mb-8">
                <h1 className="font-serif text-3xl font-bold mb-4">
                  Đặt lại mật khẩu
                </h1>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Nhập mật khẩu mới của bạn. Mật khẩu phải chứa ít nhất 1 chữ
                  hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.
                </p>
              </div>

              {recovery.error && (
                <div className="mb-6 flex gap-3 p-4 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-sm text-red-600">{recovery.error}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-6">
                <Input
                  label="Mật khẩu mới"
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={recovery.loading}
                />

                <Input
                  label="Xác nhận mật khẩu"
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={recovery.loading}
                />

                <Button
                  className="w-full uppercase tracking-wider rounded-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  disabled={recovery.loading || !newPassword || !confirmPassword}
                >
                  {recovery.loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
                </Button>
              </form>
            </>
          )}

          {/* Step 4: Success */}
          {recovery.currentStep === "success" && (
            <>
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 flex items-center justify-center rounded-full">
                    <CheckCircle2 size={32} />
                  </div>
                </div>
                <h1 className="font-serif text-3xl font-bold mb-4">
                  Thành công!
                </h1>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {recovery.successMessage}
                </p>
                <p className="text-xs text-gray-500">
                  Đang chuyển hướng đến trang đăng nhập...
                </p>
              </div>
            </>
          )}

          {/* Back to Login Link */}
          {recovery.currentStep !== "success" && (
            <div className="mt-8 text-center border-t border-gray-200 pt-6">
              <Link
                to="/auth/login"
                className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <span>←</span> Quay lại đăng nhập
              </Link>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default ForgotPassword;
