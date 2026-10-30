import React, { useMemo } from "react";
import { Ticket, Gift, Store, Info } from "lucide-react";
import { useValidCoupons, useSaveCoupon } from "@/hooks/useCoupons";
import { useAppSelector } from "@/app/stores/hooks";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/shared/utils/format";
import { useLanguage } from "@/shared/context/LanguageContext";

const VoucherCenterPage: React.FC = () => {
  const { data: validCoupons, isLoading } = useValidCoupons();
  const { mutate: saveCoupon } = useSaveCoupon();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);
  const navigate = useNavigate();
  const { t } = useLanguage();

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
      toast.error(t("login_required_save_voucher"));
      navigate("/auth/login");
      return;
    }
    if (isSaved) {
      toast.success(t("voucher_already_saved"));
      return;
    }
    saveCoupon(couponId, {
      onSuccess: () => toast.success(t("voucher_save_success")),
      onError: (err: any) =>
        toast.error(err.response?.data?.message || t("voucher_save_error")),
    });
  };

  const renderCouponCard = (
    v: any,
    index: number,
    isPlatform: boolean = true,
  ) => {
    const platformColors = [
      "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
      "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800",
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    ];
    const shopColors = [
      "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
      "bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
      "bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
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
          toast.success(`${t("voucher_copied")} ${v.code}`);
        }}
        title={t("voucher_copy_title")}
      >
        <div>
          <div className="font-black text-xl mb-2 tracking-wider flex items-center justify-between gap-2">
            <span className="truncate" title={v.code}>
              {v.code}
            </span>
            {!isPlatform && v.shop_id && (
              <span className="text-[10px] bg-white/60 px-2 py-1 rounded border border-black/10 text-black flex items-center gap-1 shrink-0 uppercase tracking-widest font-bold">
                <Store size={10} /> {t("voucher_shop_badge")}
              </span>
            )}
          </div>
          <div className="text-[13px] font-black opacity-90 leading-tight">
            {t("voucher_discount")} {displayDiscount}
            {v.max_discount ? ` (${t("voucher_maximum")} ${formatPrice(v.max_discount)})` : ""}
          </div>
          <div className="text-[11px] mt-2 font-bold opacity-75">
            {t("voucher_minimum_order")} {formatPrice(v.min_order_amount)}
          </div>
          {v.usage_limit && (
            <div className="text-[10px] mt-1 font-semibold opacity-60 flex items-center gap-1">
              <Info size={10} />
              {t("voucher_used_count")} {v.used_count}/{v.usage_limit}
            </div>
          )}
          {v.category && (
            <div className="text-[10px] mt-1 font-semibold text-primary flex items-center gap-1">
              <Info size={10} />
              {t("voucher_category_only")} {v.category.name}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => handleSaveCoupon(e, v.id, v.isSaved)}
          disabled={v.isSaved}
          className={`mt-5 w-full shrink-0 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm ${
            v.isSaved
              ? "bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
              : "bg-black text-white hover:bg-primary hover:shadow-md"
          }`}
        >
          {v.isSaved ? t("voucher_saved") : t("voucher_save_now")}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Banner */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="bg-gradient-to-r from-primary to-orange-400 rounded-3xl p-10 md:p-16 text-white relative overflow-hidden shadow-premium">
          <div className="relative z-10">
            <span className="text-white/80 font-black uppercase tracking-[0.2em] mb-4 block flex items-center gap-2">
              <Gift size={18} /> MeeMart Rewards
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-black mb-4 tracking-tight leading-tight">
              {t("voucher_center_title")}
            </h1>
            <p className="text-lg opacity-90 max-w-md font-medium">
              {t("voucher_center_desc")}
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
              <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-slate-800"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            {/* Vouchers Sàn */}
            {platformCoupons.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8 border-b-2 border-gray-200 pb-4 dark:border-slate-700">
                  <Ticket className="text-primary" size={28} />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
                    {t("voucher_platform_title")}
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
                <div className="flex items-center gap-3 mb-8 border-b-2 border-gray-200 pb-4 dark:border-slate-700">
                  <Store className="text-blue-600" size={28} />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
                    {t("voucher_shop_title")}
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
              <div className="text-center py-20 rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Ticket className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-slate-100">
                  {t("voucher_empty_title")}
                </h3>
                <p className="text-gray-500 dark:text-slate-400">
                  {t("voucher_empty_desc")}
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
