import React, { useMemo } from "react";
import { Ticket, Gift, Store, Info } from "lucide-react";
import { useValidCoupons, useSaveCoupon } from "@/hooks/useCoupons";
import { useAppSelector } from "@/app/stores/hooks";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/shared/utils/format";

const VoucherCenterPage: React.FC = () => {
  const { data: validCoupons, isLoading } = useValidCoupons();
  const { mutate: saveCoupon } = useSaveCoupon();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);
  const navigate = useNavigate();

  const { platformCoupons, shopCoupons } = useMemo(() => {
    if (!validCoupons) return { platformCoupons: [], shopCoupons: [] };

    return validCoupons.reduce(
      (acc: any, coupon: any) => {
        if (coupon.shop_id) {
          acc.shopCoupons.push(coupon);
        } else {
          acc.platformCoupons.push(coupon);
        }
        return acc;
      },
      { platformCoupons: [], shopCoupons: [] },
    );
  }, [validCoupons]);

  const handleSaveCoupon = (
    e: React.MouseEvent,
    couponId: number,
    isSaved: boolean,
  ) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để lưu mã");
      navigate("/auth/login");
      return;
    }
    if (isSaved) {
      toast.success("Bạn đã lưu mã này rồi!");
      return;
    }
    saveCoupon(couponId, {
      onSuccess: () => toast.success("Đã lưu mã giảm giá thành công!"),
      onError: (err: any) =>
        toast.error(err.response?.data?.message || "Lỗi khi lưu mã"),
    });
  };

  const renderCouponCard = (
    v: any,
    index: number,
    isPlatform: boolean = true,
  ) => {
    const platformColors = [
      "bg-orange-50 text-orange-600 border-orange-200",
      "bg-purple-50 text-purple-600 border-purple-200",
      "bg-pink-50 text-pink-600 border-pink-200",
      "bg-red-50 text-red-600 border-red-200",
    ];
    const shopColors = [
      "bg-blue-50 text-blue-600 border-blue-200",
      "bg-green-50 text-green-600 border-green-200",
      "bg-cyan-50 text-cyan-600 border-cyan-200",
      "bg-teal-50 text-teal-600 border-teal-200",
    ];

    const colors = isPlatform ? platformColors : shopColors;
    const color = colors[index % colors.length];

    const displayDiscount =
      v.discount_type === "PERCENT"
        ? `${v.discount_value}%`
        : `${formatPrice(v.discount_value)}`;

    return (
      <div
        key={v.id}
        className={`p-6 rounded-2xl border border-dashed ${color} transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between`}
        onClick={() => {
          navigator.clipboard.writeText(v.code);
          toast.success(`Đã sao chép mã ${v.code}`);
        }}
        title="Nhấn để copy mã"
      >
        <div>
          <div className="font-black text-xl mb-2 tracking-wider flex items-center justify-between gap-2">
            <span className="truncate" title={v.code}>
              {v.code}
            </span>
            {!isPlatform && v.shop_id && (
              <span className="text-[10px] bg-white/60 px-2 py-1 rounded border border-black/10 text-black flex items-center gap-1 shrink-0 uppercase tracking-widest font-bold">
                <Store size={10} /> ƯU ĐÃI SHOP
              </span>
            )}
          </div>
          <div className="text-[13px] font-black opacity-90 leading-tight">
            Giảm {displayDiscount}
            {v.max_discount ? ` (Tối đa ${formatPrice(v.max_discount)})` : ""}
          </div>
          <div className="text-[11px] mt-2 font-bold opacity-75">
            Đơn tối thiểu {formatPrice(v.min_order_amount)}
          </div>
          {v.usage_limit && (
            <div className="text-[10px] mt-1 font-semibold opacity-60 flex items-center gap-1">
              <Info size={10} />
              Đã dùng {v.used_count}/{v.usage_limit}
            </div>
          )}
          {v.category && (
            <div className="text-[10px] mt-1 font-semibold text-primary flex items-center gap-1">
              <Info size={10} />
              Chỉ áp dụng cho: {v.category.name}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => handleSaveCoupon(e, v.id, v.isSaved)}
          disabled={v.isSaved}
          className={`mt-5 w-full shrink-0 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm ${
            v.isSaved
              ? "bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300"
              : "bg-black text-white hover:bg-primary hover:shadow-md"
          }`}
        >
          {v.isSaved ? "Đã lưu vào ví" : "Lưu mã ngay"}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-20">
      {/* Banner */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="bg-gradient-to-r from-primary to-orange-400 rounded-3xl p-10 md:p-16 text-white relative overflow-hidden shadow-premium">
          <div className="relative z-10">
            <span className="text-white/80 font-black uppercase tracking-[0.2em] mb-4 block flex items-center gap-2">
              <Gift size={18} /> UTEShop Rewards
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-black mb-4 tracking-tight leading-tight">
              Trung Tâm <br /> Khuyến Mãi
            </h1>
            <p className="text-lg opacity-90 max-w-md font-medium">
              Săn ngay các mã giảm giá hấp dẫn nhất từ UTEShop và các gian hàng
              đối tác. Số lượng có hạn!
            </p>
          </div>
          <div className="absolute -right-20 -top-20 opacity-20 transform rotate-12 pointer-events-none">
            <Ticket size={400} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            {/* Vouchers Sàn */}
            {platformCoupons.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8 border-b-2 border-gray-200 pb-4">
                  <Ticket className="text-primary" size={28} />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
                    Mã Giảm Giá Từ Sàn
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {platformCoupons.map((coupon: any, index: number) =>
                    renderCouponCard(coupon, index, true),
                  )}
                </div>
              </section>
            )}

            {/* Vouchers Shop */}
            {shopCoupons.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8 border-b-2 border-gray-200 pb-4">
                  <Store className="text-blue-600" size={28} />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
                    Ưu Đãi Đặc Biệt Từ Shop
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {shopCoupons.map((coupon: any, index: number) =>
                    renderCouponCard(coupon, index, false),
                  )}
                </div>
              </section>
            )}

            {platformCoupons.length === 0 && shopCoupons.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <Ticket className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Chưa có mã giảm giá nào
                </h3>
                <p className="text-gray-500">
                  Hãy quay lại sau để cập nhật những ưu đãi mới nhất nhé!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoucherCenterPage;
