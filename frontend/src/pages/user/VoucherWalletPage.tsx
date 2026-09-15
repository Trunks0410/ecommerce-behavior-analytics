import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Ticket, Store, Clock, CheckCircle, Search, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useMyVoucherWallet, useSaveCouponByCode } from "@/hooks/useCoupons";

export default function VoucherWalletPage() {
  const [activeTab, setActiveTab] = useState<"VALID" | "HISTORY">("VALID");
  const [couponCode, setCouponCode] = useState("");
  
  const { data, isLoading } = useMyVoucherWallet();
  const { mutate: saveByCode, isPending: isSaving } = useSaveCouponByCode();
  const navigate = useNavigate();

  const handleSaveCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    
    saveByCode(couponCode.trim(), {
      onSuccess: () => {
        toast.success("Đã lưu mã giảm giá thành công!");
        setCouponCode("");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || "Lỗi khi lưu mã");
      }
    });
  };

  const validCoupons = data?.validCoupons || [];
  const historyCoupons = data?.historyCoupons || [];

  return (
    <div className="min-h-screen bg-[#faf9f6] pt-8 pb-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Main Content */}
          <div className="flex-grow">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Kho Voucher</h1>
                  <p className="text-gray-500 font-medium text-sm mt-1">Quản lý tất cả mã giảm giá của bạn</p>
                </div>
                
                {/* Search/Save Input */}
                <form onSubmit={handleSaveCode} className="w-full md:w-auto relative flex items-center">
                  <input
                    type="text"
                    placeholder="Nhập mã voucher..."
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full md:w-72 h-12 pl-4 pr-24 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium uppercase text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !couponCode.trim()}
                    className="absolute right-1 top-1 bottom-1 px-4 bg-black text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-primary transition-all disabled:opacity-50"
                  >
                    {isSaving ? "Đang lưu" : "Lưu mã"}
                  </button>
                </form>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  className={`pb-4 px-6 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === "VALID" 
                      ? "border-primary text-primary" 
                      : "border-transparent text-gray-400 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("VALID")}
                >
                  Có hiệu lực ({validCoupons.length})
                </button>
                <button
                  className={`pb-4 px-6 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === "HISTORY" 
                      ? "border-black text-black" 
                      : "border-transparent text-gray-400 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("HISTORY")}
                >
                  Lịch sử ({historyCoupons.length})
                </button>
              </div>

              {/* Coupons List */}
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <span className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></span>
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
                    <div className="col-span-1 lg:col-span-2 text-center py-16 text-gray-400">
                      <Ticket size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold">Bạn chưa có mã giảm giá nào có hiệu lực.</p>
                      <Link to="/" className="text-primary font-black uppercase text-sm mt-2 inline-flex items-center gap-1 hover:underline">
                        Sưu tầm ngay <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                  {activeTab === "HISTORY" && historyCoupons.length === 0 && (
                    <div className="col-span-1 lg:col-span-2 text-center py-16 text-gray-400">
                      <Clock size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold">Chưa có lịch sử sử dụng mã giảm giá.</p>
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
  const isPlatform = !coupon.shop_id;
  const colorClass = isPlatform ? "border-primary bg-primary/5" : "border-black bg-gray-50";
  const iconColor = isPlatform ? "text-primary" : "text-black";
  
  const displayDiscount = coupon.discount_type === 'PERCENT' 
    ? `${coupon.discount_value}%` 
    : `₫${Number(coupon.discount_value).toLocaleString()}`;
    
  // Tính hạn sử dụng
  const endDate = new Date(coupon.end_date);
  const now = new Date();
  const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
  const isExpiringSoon = isValid && diffDays <= 3 && diffDays > 0;

  return (
    <div className={`flex rounded-2xl border border-dashed ${isValid ? colorClass : 'border-gray-300 bg-gray-100 opacity-60'} overflow-hidden relative`}>
      
      {/* Left side: Icon & Type */}
      <div className={`w-28 flex flex-col items-center justify-center border-r border-dashed ${isValid ? 'border-gray-200' : 'border-gray-300'} p-4`}>
        {isPlatform ? (
          <Ticket size={32} className={`${isValid ? iconColor : 'text-gray-400'} mb-2`} />
        ) : (
          <Store size={32} className={`${isValid ? iconColor : 'text-gray-400'} mb-2`} />
        )}
        <span className={`text-[10px] font-black uppercase text-center tracking-wider ${isValid ? iconColor : 'text-gray-500'}`}>
          {isPlatform ? "Mã Sàn" : "Mã Shop"}
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
                  isPlatform ? "bg-primary text-white hover:bg-primary/90" : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                Dùng ngay
              </button>
            ) : (
              <span className="px-2 py-1 rounded bg-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                {coupon.userCouponStatus === 'USED' ? 'Đã dùng' : 'Hết hạn'}
              </span>
            )}
          </div>
          <div className="text-xl font-black uppercase tracking-tighter text-gray-900 leading-none mb-1">
            Giảm {displayDiscount}
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
            Đơn tối thiểu ₫{Number(coupon.min_order_amount).toLocaleString()}
          </div>
          {coupon.max_discount && (
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Giảm tối đa ₫{Number(coupon.max_discount).toLocaleString()}
            </div>
          )}
          {coupon.category && (
            <div className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">
              Áp dụng cho: {coupon.category.name}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="mt-3 flex items-center justify-between">
          <div className={`text-[10px] font-bold flex items-center gap-1 ${isExpiringSoon ? 'text-red-500' : 'text-gray-400'}`}>
            <Clock size={12} /> 
            {isValid 
              ? (isExpiringSoon ? `Sắp hết hạn: còn ${diffDays} ngày` : `HSD: ${endDate.toLocaleDateString('vi-VN')}`) 
              : `Đã lưu từ: ${new Date(coupon.created_at).toLocaleDateString('vi-VN')}`
            }
          </div>
        </div>
      </div>
    </div>
  );
}
