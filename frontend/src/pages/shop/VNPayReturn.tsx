import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { axiosClient } from "@/shared/api/axiosClient";

const VNPayReturn = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const response = await axiosClient.get(
          `/payment/vnpay_return?${searchParams.toString()}`,
        );

        if (response.data.code === "00") {
          setStatus("success");
          setMessage("Thanh toán thành công");
        } else {
          setStatus("failed");
          setMessage("Thanh toán thất bại hoặc đã bị hủy");
        }
      } catch (error: any) {
        setStatus("failed");
        setMessage(error.response?.data?.message || "Lỗi xác thực thanh toán");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-32 px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl text-center">
        {status === "loading" && (
          <div className="py-12">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">
              Đang xác thực thanh toán...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="py-8 space-y-6">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto border-4 border-green-500">
              <Check size={48} strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-serif font-black tracking-tighter uppercase text-green-600">
              Thành công!
            </h1>
            <p className="text-gray-600 font-medium">
              Giao dịch qua VNPay đã được xử lý thành công. Đơn hàng của bạn
              đang được chuẩn bị.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <Link
                to="/orders"
                className="bg-black text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Xem đơn hàng
              </Link>
              <Link
                to="/"
                className="bg-gray-100 text-black px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="py-8 space-y-6">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-500">
              <X size={48} strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-serif font-black tracking-tighter uppercase text-red-600">
              Thất bại
            </h1>
            <p className="text-gray-600 font-medium">{message}</p>
            <div className="pt-4">
              <Link
                to="/orders"
                className="bg-primary text-white block w-full px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
              >
                Xem lại đơn hàng
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VNPayReturn;
