import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Ticket, Store, Clock, CheckCircle, Search, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useMyVoucherWallet, useSaveCouponByCode } from "@/hooks/useCoupons";
import { getCurrentLocale } from "@/shared/utils/format";
import { useLanguage } from "@/shared/context/LanguageContext";

export default function VoucherWalletPage() {
  const [activeTab, setActiveTab] = useState<"VALID" | "HISTORY">("VALID");
  const [couponCode, setCouponCode] = useState("");
  
  const { data, isLoading } = useMyVoucherWallet();
  const { mutate: saveByCode, isPending: isSaving } = useSaveCouponByCode();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSaveCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    
    saveByCode(couponCode.trim(), {
      onSuccess: () => {
        toast.success(t("voucher_save_success"));
        setCouponCode("");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || t("voucher_save_error"));
      }
    });
  };

  const validCoupons = data?.validCoupons || [];
  const historyCoupons = data?.historyCoupons || [];

  return (
    <div className="min-h-screen bg-[#faf9f6] pt-8 pb-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Main Content */}
          <div className="flex-grow">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter md:text-3xl">{t("voucher_wallet_title")}</h1>
                  <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">{t("voucher_wallet_desc")}</p>
                </div>
                
                {/* Search/Save Input */}
                <form onSubmit={handleSaveCode} className="w-full md:w-auto relative flex items-center">
                  <input
                    type="text"
                    placeholder={t("voucher_code_placeholder")}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-24 text-sm font-medium uppercase transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-700 md:w-72"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !couponCode.trim()}
                    className="absolute right-1 top-1 bottom-1 px-4 bg-black text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-primary transition-all disabled:opacity-50"
                  >
                    {isSaving ? t("voucher_saving") : t("voucher_save")}
                  </button>
                </form>
              </div>

              {/* Tabs */}
              <div className="mb-6 flex border-b border-gray-200 dark:border-slate-700">
                <button
                  className={`pb-4 px-6 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === "VALID" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }`}
                  onClick={() => setActiveTab("VALID")}
                >
                  {t("voucher_valid_tab")} ({validCoupons.length})
                </button>
                <button
                  className={`pb-4 px-6 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === "HISTORY" 
                      ? "border-black text-black dark:border-white dark:text-white"
                      : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }`}
                  onClick={() => setActiveTab("HISTORY")}
                >
                  {t("voucher_history_tab")} ({historyCoupons.length})
                </button>
              </div>

              {/* Coupons List */}
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent dark:border-slate-200 dark:border-t-transparent"></span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeTab === "VALID" && validCoupons.map((v: any) => (
                    <CouponCard key={v.id} coupon={v} isValid={true} navigate={navigate} />
                  ))}
                  {activeTab === "HISTORY" && historyCoupons.map((v: any) => (
                    <CouponCard key={v.id} coupon={v} isValid={false} navigate={navigate} />
                  ))}
                  
                  {/* Empty States */}
                  {activeTab === "VALID" && validCoupons.length === 0 && (
                    <div className="col-span-1 py-16 text-center text-gray-400 dark:text-slate-500 lg:col-span-2">
                      <Ticket size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold">{t("voucher_no_valid")}</p>
                      <Link to="/" className="text-primary font-black uppercase text-sm mt-2 inline-flex items-center gap-1 hover:underline">
                        {t("voucher_collect_now")} <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                  {activeTab === "HISTORY" && historyCoupons.length === 0 && (
                    <div className="col-span-1 py-16 text-center text-gray-400 dark:text-slate-500 lg:col-span-2">
                      <Clock size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold">{t("voucher_no_history")}</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CouponCard({ coupon, isValid, navigate }: { coupon: any, isValid: boolean, navigate: any }) {
  const { t } = useLanguage();
  const isPlatform = !coupon.shop_id;
  const colorClass = isPlatform ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-black bg-gray-50 dark:border-slate-600 dark:bg-slate-800";
  const iconColor = isPlatform ? "text-primary" : "text-black dark:text-slate-100";
  
  const displayDiscount = coupon.discount_type === 'PERCENT' 
    ? `${coupon.discount_value}%` 
    : `₫${Number(coupon.discount_value).toLocaleString()}`;
    
  // Tính hạn sử dụng
  const endDate = new Date(coupon.end_date);
  const now = new Date();
  const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
  const isExpiringSoon = isValid && diffDays <= 3 && diffDays > 0;

  return (
    <div className={`relative flex overflow-hidden rounded-2xl border border-dashed ${isValid ? colorClass : 'border-gray-300 bg-gray-100 opacity-60 dark:border-slate-700 dark:bg-slate-800/60'}`}>
      
      {/* Left side: Icon & Type */}
      <div className={`flex w-28 flex-col items-center justify-center border-r border-dashed p-4 ${isValid ? 'border-gray-200 dark:border-slate-700' : 'border-gray-300 dark:border-slate-700'}`}>
        {isPlatform ? (
          <Ticket size={32} className={`${isValid ? iconColor : 'text-gray-400'} mb-2`} />
        ) : (
          <Store size={32} className={`${isValid ? iconColor : 'text-gray-400'} mb-2`} />
        )}
        <span className={`text-[10px] font-black uppercase text-center tracking-wider ${isValid ? iconColor : 'text-gray-500'}`}>
          {isPlatform ? t("voucher_platform") : t("voucher_shop")}
        </span>
      </div>
      
      {/* Right side: Info */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-1">
            <span className="font-black text-lg tracking-wider">{coupon.code}</span>
            {isValid ? (
              <button 
                onClick={() => {
                  if (isPlatform) navigate("/");
                  else navigate(`/shop/${coupon.shop_id}`);
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  isPlatform ? "bg-primary text-white hover:bg-primary/90" : "bg-black text-white hover:bg-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                }`}
              >
                {t("voucher_use_now")}
              </button>
            ) : (
              <span className="rounded bg-gray-200 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-slate-700 dark:text-slate-300">
                {coupon.userCouponStatus === 'USED' ? t("voucher_used") : t("voucher_expired")}
              </span>
            )}
          </div>
          <div className="mb-1 text-xl font-black uppercase leading-none tracking-tighter text-gray-900 dark:text-slate-100">
            {t("voucher_discount")} {displayDiscount}
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
            {t("voucher_minimum_order_wallet")} ₫{Number(coupon.min_order_amount).toLocaleString()}
          </div>
          {coupon.max_discount && (
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {t("voucher_maximum_discount")} ₫{Number(coupon.max_discount).toLocaleString()}
            </div>
          )}
          {coupon.category && (
            <div className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">
              {t("voucher_applies_to")} {coupon.category.name}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="mt-3 flex items-center justify-between">
          <div className={`text-[10px] font-bold flex items-center gap-1 ${isExpiringSoon ? 'text-red-500' : 'text-gray-400'}`}>
            <Clock size={12} /> 
            {isValid 
              ? (isExpiringSoon ? `${t("voucher_expiring_in")} ${diffDays} ${t("voucher_days")}` : `${t("voucher_expiry")} ${endDate.toLocaleDateString(getCurrentLocale())}`)
              : `${t("voucher_saved_at")} ${new Date(coupon.created_at).toLocaleDateString(getCurrentLocale())}`
            }
          </div>
        </div>
      </div>
    </div>
  );
}
