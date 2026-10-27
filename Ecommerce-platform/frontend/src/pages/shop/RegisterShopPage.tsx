import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ChevronLeft } from "lucide-react";
import { vendorService } from "@/services/vendorService";
import { useAppDispatch } from "@/app/stores/hooks";
import { initAuthThunk } from "@/app/stores/slices/authSlice";

const RegisterShopPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    phone: "",
    industry: "Thời trang Nam",
    address: "",
    description: "",
  });

  const handleRegisterShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await vendorService.registerShop(registerForm);
      if (res && res.data) {
        alert("Khởi tạo gian hàng thành công!");
        // Cập nhật lại thông tin user để nhận role mới (VENDOR)
        await dispatch(initAuthThunk());
        navigate("/vendor");
      }
    } catch (err: any) {
      console.error(err);
      alert(
        err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-12 px-6">
      <div className="max-w-2xl w-full mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:text-primary transition-all mb-8"
        >
          <ChevronLeft size={20} /> Quay lại
        </button>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-brutal">
            <Store size={32} />
          </div>
          <h1 className="text-4xl font-serif font-black tracking-tighter uppercase">
            Trở thành Người bán hàng
          </h1>
          <p className="text-gray-500 font-medium mt-2">
            Mở gian hàng của bạn trên UTEShop và bắt đầu kinh doanh ngay hôm nay
          </p>
        </div>

        <div className="bg-white border-2 border-black rounded-[2.5rem] p-10 shadow-brutal">
          <form className="space-y-8" onSubmit={handleRegisterShopSubmit}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Tên gian hàng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: UTEShop Official"
                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Số điện thoại kinh doanh
                  </label>
                  <input
                    type="tel"
                    placeholder="0xxx xxx xxx"
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    value={registerForm.phone}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        phone: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Ngành hàng chính
                  </label>
                  <select
                    className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                    value={registerForm.industry}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        industry: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="Thời trang Nam">Thời trang Nam</option>
                    <option value="Thời trang Nữ">Thời trang Nữ</option>
                    <option value="Phụ kiện & Trang sức">
                      Phụ kiện & Trang sức
                    </option>
                    <option value="Giày dép">Giày dép</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Địa chỉ kho hàng (Lấy hàng)
                </label>
                <textarea
                  rows={3}
                  placeholder="Số nhà, tên đường, phường/xã..."
                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                  value={registerForm.address}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      address: e.target.value,
                    })
                  }
                  required
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Mô tả shop (Giới thiệu ngắn gọn)
                </label>
                <input
                  type="text"
                  placeholder="Giới thiệu phong cách sản phẩm của shop..."
                  className="w-full bg-gray-50 border-2 border-black rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  value={registerForm.description}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 rounded border-black text-primary focus:ring-primary"
                  required
                />
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
                  Tôi đồng ý với các{" "}
                  <span className="text-primary underline cursor-pointer">
                    Điều khoản & Chính sách
                  </span>{" "}
                  dành cho Người bán của UTEShop.
                </p>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full btn-brutal py-5 text-sm shadow-brutal hover:bg-primary transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
            >
              {loading ? "ĐANG XỬ LÝ..." : "KHỞI TẠO GIAN HÀNG NGAY"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterShopPage;
