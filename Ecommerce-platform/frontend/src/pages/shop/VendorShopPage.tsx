import React, { useState, useMemo } from 'react';
import { 
  Store, 
  Star, 
  Users, 
  MessageCircle, 
  Plus, 
  Share2, 
  Clock, 
  ShieldCheck, 
  Check,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { vendorService } from "@/services/vendorService";
import { useSaveCoupon } from "@/hooks/useCoupons";
import { useAppSelector } from "@/app/stores/hooks";
import toast from "react-hot-toast";
import ProductCard from '@/shared/components/ui/ProductCard';
import { formatPrice } from '@/shared/utils/format';

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const DEFAULT_SHOP_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='128' height='128'><rect width='100' height='100' fill='%23FFE4D6' stroke='black' stroke-width='4'/><path d='M20 40 L50 15 L80 40 L80 85 L20 85 Z' fill='white' stroke='black' stroke-width='4'/><rect x='40' y='55' width='20' height='30' fill='%23D97736' stroke='black' stroke-width='4'/><path d='M15 40 L85 40' stroke='black' stroke-width='4'/></svg>";

const VendorShopPage: React.FC = () => {

  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("home");
  const [isFollowed, setIsFollowed] = useState(false);
  const [sortType, setSortType] = useState("newest");
  const [searchVal, setSearchVal] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [swiperPromoRef, setSwiperPromoRef] = useState<any>(null);
  const [swiperBestSellerRef, setSwiperBestSellerRef] = useState<any>(null);
  const [swiperFeaturedRef, setSwiperFeaturedRef] = useState<any>(null);

  const { mutate: saveCoupon } = useSaveCoupon();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);
  const navigate = useNavigate();

  // 1. Lấy thông tin chi tiết Shop
  const { data: shopProfileRes, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ["shop-profile", id],
    queryFn: () => vendorService.getShopProfile(id!),
    enabled: !!id,
  });
  const shop = shopProfileRes?.data;

  // 2. Lấy danh sách mã giảm giá của Shop
  const { data: shopVouchersRes } = useQuery({
    queryKey: ["shop-vouchers", id],
    queryFn: () => vendorService.getShopVouchers(id!),
    enabled: !!id,
  });
  const vouchers = shopVouchersRes?.data || [];

  // 3. Lấy toàn bộ sản phẩm của Shop để trích xuất danh mục
  const { data: allShopProductsRes, isLoading: isLoadingAllProducts } = useQuery({
    queryKey: ["all-shop-products", id],
    queryFn: () => vendorService.getShopProducts(id!, { limit: 100 }),
    enabled: !!id,
  });
  const allProducts = allShopProductsRes?.data?.products || [];

  // Trích xuất các danh mục độc nhất của các sản phẩm có trong Shop
  const shopCategories = useMemo(() => {
    const map = new Map<string, string>();
    allProducts.forEach((p: any) => {
      if (p.category) {
        map.set(p.category.slug, p.category.name);
      }
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [allProducts]);

  // Trích xuất 2 sản phẩm bán chạy nhất làm hot products
  const bestSellers = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
      .slice(0, 2);
  }, [allProducts]);

  // Trích xuất các nhóm sản phẩm cho trang chủ Shop
  const featuredShopProducts = useMemo(() => {
    return allProducts
      .filter((p: any) => p.is_featured === true || p.is_featured === 1 || p.is_featured === 'true')
      .slice(0, 5);
  }, [allProducts]);

  const promoShopProducts = useMemo(() => {
    return allProducts
      .filter((p: any) => p.sale_price !== null && Number(p.sale_price) < Number(p.price))
      .slice(0, 5);
  }, [allProducts]);

  const bestSellerShopProducts = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
      .slice(0, 5);
  }, [allProducts]);

  // 4. Lấy sản phẩm đã qua lọc/sắp xếp/tìm kiếm
  const { data: filteredProductsRes, isLoading: isLoadingFilteredProducts } = useQuery({
    queryKey: ["shop-filtered-products", id, activeTab, sortType, searchKeyword],
    queryFn: () => {
      const params: any = {
        limit: 30,
        sortBy: sortType,
        keyword: searchKeyword || undefined
      };
      // Nếu tab hiện tại là một danh mục, lọc theo categorySlug
      if (activeTab !== "home" && activeTab !== "all") {
        params.categorySlug = activeTab;
      }
      return vendorService.getShopProducts(id!, params);
    },
    enabled: !!id,
  });
  const filteredProducts = filteredProductsRes?.data?.products || [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(searchVal);
    if (activeTab === "home") {
      setActiveTab("all"); // chuyển sang tab tất cả sản phẩm khi tìm kiếm
    }
  };

  const getJoinDuration = (createdAt?: string) => {
    if (!createdAt) return "4 năm";
    const diffYears = new Date().getFullYear() - new Date(createdAt).getFullYear();
    return diffYears > 0 ? `${diffYears} năm` : "Mới";
  };

  if (isLoadingProfile || isLoadingAllProducts) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-primary rounded-full mb-6"></div>
        <h2 className="font-serif font-black text-3xl uppercase tracking-tighter">
          Đang tải cửa hàng...
        </h2>
        <p className="text-gray-400 font-bold text-sm mt-2">
          Vui lòng chờ trong giây lát
        </p>
      </div>
    );
  }

  if (profileError || !shop) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center space-y-6">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
        <h2 className="font-serif font-black text-3xl uppercase tracking-tighter">
          Không tìm thấy cửa hàng!
        </h2>
        <p className="text-gray-400 font-bold text-sm">
          Cửa hàng có thể đã bị khóa hoặc đường dẫn không chính xác.
        </p>
        <Link
          to="/products"
          className="btn-brutal px-8 py-3 text-xs uppercase tracking-widest inline-block"
        >
          Quay lại mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F0] text-black font-sans pb-20">
      {/* 1. KHỐI THÔNG TIN SHOP (Shop Hero Section) */}
      <section className="pt-10 px-6 max-w-7xl mx-auto">
        <div 
          className="bg-white border-[3px] border-black rounded-[2.5rem] p-8 shadow-brutal flex flex-col md:flex-row gap-8 items-stretch bg-cover bg-center relative overflow-hidden"
          style={{ backgroundImage: shop.cover_url ? `linear-gradient(to right, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.8) 100%), url(${shop.cover_url})` : undefined }}
        >
          {/* Left: Profile Information */}
          <div className="flex-grow flex items-center gap-6 pr-8 md:border-r-2 md:border-black/5 relative z-10">
            <div className="relative shrink-0">
               <div className="w-28 h-28 bg-primary rounded-full border-[3px] border-black overflow-hidden shadow-subtle">
                  <img src={shop.shop_logo || shop.avatar_url || DEFAULT_SHOP_LOGO} alt="Avatar Shop" className="w-full h-full object-cover" />
               </div>
               <div className="absolute -bottom-2 -right-2 bg-black text-white px-3 py-1 rounded-full border-2 border-white text-[8px] font-black uppercase tracking-widest shadow-sm">
                  Official
               </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-serif font-black tracking-tighter uppercase">{shop.shop_name || shop.name}</h1>
                <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-lg border-2 border-black shadow-subtle uppercase tracking-widest">
                   Yêu Thích
                </span>
              </div>
              <p className="text-gray-500 font-medium text-sm italic">
                {shop.description || "Phong cách tối giản cho tâm hồn hiện đại."}
              </p>
              
              <div className="flex gap-3 mt-2 flex-wrap">
                <button 
                  type="button"
                  onClick={() => setIsFollowed(!isFollowed)}
                  className={`px-8 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${isFollowed ? 'bg-gray-100 text-black' : 'bg-black text-white hover:bg-primary'}`}
                >
                  {isFollowed ? <span className="flex items-center gap-2"><Check size={14} /> ĐÃ THEO DÕI</span> : '+ THEO DÕI'}
                </button>
                <button 
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('openChat', { detail: { shopId: shop.id, shopName: shop.shop_name || shop.name, shopLogo: shop.shop_logo || shop.avatar_url } }))}
                  className="px-6 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-white hover:bg-primary hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-2"
                >


                  <MessageCircle size={16} /> Chat ngay
                </button>
                <button type="button" className="p-3 border-2 border-black rounded-xl hover:bg-primary hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Statistics Bento Grid */}
          <div className="grid grid-cols-2 gap-4 shrink-0 md:w-80 relative z-10">
            {[
              { label: "Đánh giá", value: shop.rating ? `${Number(shop.rating).toFixed(1)}/5` : "4.9/5", icon: <Star size={12} className="fill-primary text-primary" />, sub: `(${shop.reviewsCount !== undefined ? shop.reviewsCount : "12k"} đánh giá)` },
              { label: "Người theo dõi", value: shop.followers_count !== undefined ? `${((shop.followers_count + (isFollowed ? 1 : 0)) / 1000).toFixed(1)}k` : "85k", icon: <Users size={12} />, sub: "+1.2k tháng này" },
              { label: "Tỉ lệ phản hồi", value: shop.response_rate !== undefined ? `${shop.response_rate}%` : "98%", icon: <MessageCircle size={12} />, sub: "(Trong vài giờ)" },
              { label: "Tham gia", value: getJoinDuration(shop.created_at), icon: <Clock size={12} />, sub: `Từ ${shop.created_at ? new Date(shop.created_at).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : 'T5/2020'}` }
            ].map((stat, i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm border-2 border-black/5 rounded-2xl p-4 flex flex-col justify-between group hover:border-black/20 transition-all">
                <div className="flex justify-between items-start">
                   <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{stat.label}</span>
                   <div className="text-gray-400 group-hover:text-primary transition-colors">{stat.icon}</div>
                </div>
                <div>
                   <p className="text-lg font-black tracking-tighter">{stat.value}</p>
                   <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. KHỐI MÃ GIẢM GIÁ (Shop Vouchers) */}
      {vouchers.length > 0 && (
        <section className="pt-12 px-6 max-w-7xl mx-auto relative z-10">
           <div className="flex gap-6 overflow-x-auto pt-4 pb-4 scrollbar-hide">
              {vouchers.map((v: any, i: number) => {
                const colors = [
                  { color: "bg-orange-50", text: "text-orange-500", border: "border-orange-200" },
                  { color: "bg-blue-50", text: "text-blue-500", border: "border-blue-200" },
                  { color: "bg-purple-50", text: "text-purple-500", border: "border-purple-200" },
                  { color: "bg-green-50", text: "text-green-500", border: "border-green-200" }
                ];
                const design = colors[i % colors.length];
                const displayDiscount = v.discount_type === "PERCENTAGE" 
                  ? `${Number(v.discount_value)}%` 
                  : `${formatPrice(v.discount_value)}`;

                return (
                  <div key={v.id} className={`min-w-[280px] ${design.color} border-2 border-black rounded-2xl p-5 flex items-center gap-4 relative shadow-subtle hover:-translate-y-1 transition-all cursor-pointer group`}>
                     <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-[#F4F4F0] border-2 border-black rounded-full"></div>
                     <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-[#F4F4F0] border-2 border-black rounded-full"></div>
                     
                     <div className="flex flex-col flex-grow pl-2">
                        <span className="text-2xl font-black tracking-tighter uppercase">Giảm {displayDiscount}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Đơn tối thiểu ₫{Number(v.min_order_amount).toLocaleString()}</span>
                     </div>
                     <button 
                       type="button" 
                       onClick={(e) => {
                         e.stopPropagation();
                         if (!isAuthenticated) {
                           toast.error("Vui lòng đăng nhập để lưu mã");
                           navigate("/auth/login");
                           return;
                         }
                         if (v.isSaved) {
                           toast.success("Bạn đã lưu mã này rồi!");
                           return;
                         }
                         saveCoupon(v.id, {
                           onSuccess: () => toast.success("Đã lưu mã giảm giá thành công!"),
                           onError: (err: any) => toast.error(err.response?.data?.message || "Lỗi khi lưu mã"),
                         });
                       }}
                       disabled={v.isSaved}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${
                         v.isSaved ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-black text-white group-hover:bg-primary"
                       }`}
                     >
                       {v.isSaved ? "Đã lưu" : "Lưu mã"}
                     </button>
                  </div>
                );
              })}
           </div>
        </section>
      )}

      {/* 3. THANH ĐIỀU HƯỚNG SHOP (Shop Navigation Tabs) */}
      <section className="sticky top-20 z-40 bg-[#F4F4F0]/80 backdrop-blur-md pt-4 border-b-2 border-black/5 mb-8">
         <div className="max-w-7xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
               {[
                 { id: "home", label: "Trang chủ Shop" },
                 { id: "all", label: "Tất cả sản phẩm" },
                 ...shopCategories.map(cat => ({ id: cat.slug, label: cat.name }))
               ].map(tab => (
                 <button
                   key={tab.id}
                   type="button"
                   onClick={() => {
                     setActiveTab(tab.id);
                     setSearchKeyword(""); // clear search when switching tabs
                     setSearchVal("");
                   }}
                   className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-black after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-black' : 'text-gray-400 hover:text-black'}`}
                 >
                   {tab.label}
                 </button>
               ))}
            </div>
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64 pb-2">
               <input 
                 type="text" 
                 value={searchVal}
                 onChange={(e) => setSearchVal(e.target.value)}
                 placeholder="Tìm tại shop này..." 
                 className="w-full bg-white border-2 border-black rounded-xl px-10 py-2.5 text-xs font-bold focus:outline-none shadow-inner" 
               />
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 -mt-1 text-gray-400" size={16} />
            </form>
         </div>
      </section>

      {/* 4. TRANG CHỦ SHOP Content (Lookbook & Featured) */}
      <main className="px-6 max-w-7xl mx-auto space-y-16">
         {activeTab === "home" ? (
           <>
             {/* Bento Grid Featured */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
                {/* Lookbook Big Card */}
                <div className="lg:col-span-8 bg-white border-[3px] border-black rounded-[3rem] overflow-hidden relative group shadow-brutal min-h-[400px]">
                   <img 
                    src={shop.cover_url || "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1200"} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt="Featured Lookbook"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                   <div className="absolute bottom-12 left-12 text-white">
                      <span className="bg-primary px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4 inline-block">BỘ SƯU TẬP MỚI</span>
                      <h2 className="text-6xl font-serif font-black tracking-tighter uppercase leading-none mb-6">{shop.shop_name || shop.name}</h2>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("all")}
                        className="px-10 py-4 bg-white text-black border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:shadow-none transition-all active:translate-x-1 active:translate-y-1"
                      >
                        Khám phá sản phẩm
                      </button>
                   </div>
                </div>

                {/* Hot Products Column */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                   {bestSellers.length > 0 ? (
                     bestSellers.map((p: any, i: number) => (
                       <div key={p.id} className="flex-grow bg-white border-[3px] border-black rounded-[2.5rem] p-6 shadow-brutal flex flex-col group relative justify-between">
                          <div className="absolute top-6 left-6 z-10">
                             <span className="bg-black text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">TOP {i + 1} BÁN CHẠY</span>
                          </div>
                          <div className="aspect-[16/10] bg-gray-50 rounded-2xl overflow-hidden mb-4 border border-black/5 cursor-pointer" onClick={() => window.location.href = `/products/${p.slug}`}>
                             <img 
                              src={p.images?.[0]?.image_url || "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400"} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                              alt={p.name}
                             />
                          </div>
                          <div>
                             <h4 className="text-sm font-black uppercase tracking-tight mb-1 truncate cursor-pointer hover:text-primary" onClick={() => window.location.href = `/products/${p.slug}`}>{p.name}</h4>
                             <div className="flex items-center justify-between">
                                <span className="text-lg font-black text-primary">{formatPrice(p.sale_price || p.price)}</span>
                                <button 
                                  type="button" 
                                  onClick={() => window.location.href = `/products/${p.slug}`}
                                  className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                                >
                                  <Plus size={20}/>
                                </button>
                             </div>
                          </div>
                       </div>
                     ))
                   ) : null}
                </div>
              </div>

              {/* 5. PHÂN CHIA CÁC MỤC SẢN PHẨM (Khuyến mãi, Bán chạy, Nổi bật) */}
              {allProducts.length === 0 ? (
                <div className="bg-white border-2 border-black rounded-3xl p-12 text-center text-gray-400 font-bold pt-10">
                  Cửa hàng chưa đăng bán sản phẩm nào
                </div>
              ) : (
                <div className="space-y-20 pt-10">
                  {/* Mục 1: Khuyến mãi */}
                  {promoShopProducts.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b-[3px] border-black pb-4">
                        <div className="space-y-1">
                          <h3 className="text-2xl md:text-3xl font-serif font-black uppercase tracking-tighter">Khuyến mãi cực hời</h3>
                          <div className="w-16 h-1.5 bg-primary"></div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => swiperPromoRef?.slidePrev()}
                            className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center bg-white hover:bg-primary hover:text-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                            title="Trước"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => swiperPromoRef?.slideNext()}
                            className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center bg-white hover:bg-primary hover:text-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                            title="Sau"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>

                      <Swiper
                        onSwiper={setSwiperPromoRef}
                        modules={[Pagination, Autoplay]}
                        spaceBetween={24}
                        slidesPerView={1}
                        autoplay={{
                          delay: 3000,
                          disableOnInteraction: false,
                          pauseOnMouseEnter: true,
                        }}
                        pagination={{ clickable: true }}
                        breakpoints={{
                          500: { slidesPerView: 2, spaceBetween: 16 },
                          768: { slidesPerView: 3, spaceBetween: 20 },
                          1024: { slidesPerView: 5, spaceBetween: 24 },
                        }}
                        className="pb-14 shop-swiper"
                      >
                        {promoShopProducts.map((p: any) => (
                          <SwiperSlide key={p.id}>
                            <div className="p-1">
                              <ProductCard
                                id={p.slug}
                                name={p.name}
                                price={p.sale_price || p.price}
                                originalPrice={p.sale_price ? p.price : undefined}
                                image={p.images?.[0]?.image_url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400"}
                                category={p.category?.name || "Danh mục"}
                                rating={p.rating_average || 0}
                                sales={p.sold_count}
                                badge="Sale"
                                shop={shop}
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  )}

                  {/* Mục 2: Bán chạy nhất */}
                  {bestSellerShopProducts.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b-[3px] border-black pb-4">
                        <div className="space-y-1">
                          <h3 className="text-2xl md:text-3xl font-serif font-black uppercase tracking-tighter">Bán chạy nhất</h3>
                          <div className="w-16 h-1.5 bg-primary"></div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => swiperBestSellerRef?.slidePrev()}
                            className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center bg-white hover:bg-primary hover:text-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                            title="Trước"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => swiperBestSellerRef?.slideNext()}
                            className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center bg-white hover:bg-primary hover:text-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                            title="Sau"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>

                      <Swiper
                        onSwiper={setSwiperBestSellerRef}
                        modules={[Pagination, Autoplay]}
                        spaceBetween={24}
                        slidesPerView={1}
                        autoplay={{
                          delay: 3000,
                          disableOnInteraction: false,
                          pauseOnMouseEnter: true,
                        }}
                        pagination={{ clickable: true }}
                        breakpoints={{
                          500: { slidesPerView: 2, spaceBetween: 16 },
                          768: { slidesPerView: 3, spaceBetween: 20 },
                          1024: { slidesPerView: 5, spaceBetween: 24 },
                        }}
                        className="pb-14 shop-swiper"
                      >
                        {bestSellerShopProducts.map((p: any) => (
                          <SwiperSlide key={p.id}>
                            <div className="p-1">
                              <ProductCard
                                id={p.slug}
                                name={p.name}
                                price={p.sale_price || p.price}
                                originalPrice={p.sale_price ? p.price : undefined}
                                image={p.images?.[0]?.image_url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400"}
                                category={p.category?.name || "Danh mục"}
                                rating={p.rating_average || 0}
                                sales={p.sold_count}
                                badge={p.sold_count > 15 ? "Hot" : undefined}
                                shop={shop}
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  )}

                  {/* Mục 3: Sản phẩm nổi bật */}
                  {featuredShopProducts.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b-[3px] border-black pb-4">
                        <div className="space-y-1">
                          <h3 className="text-2xl md:text-3xl font-serif font-black uppercase tracking-tighter">Sản phẩm nổi bật</h3>
                          <div className="w-16 h-1.5 bg-primary"></div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => swiperFeaturedRef?.slidePrev()}
                            className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center bg-white hover:bg-primary hover:text-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                            title="Trước"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => swiperFeaturedRef?.slideNext()}
                            className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center bg-white hover:bg-primary hover:text-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                            title="Sau"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>

                      <Swiper
                        onSwiper={setSwiperFeaturedRef}
                        modules={[Pagination, Autoplay]}
                        spaceBetween={24}
                        slidesPerView={1}
                        autoplay={{
                          delay: 3000,
                          disableOnInteraction: false,
                          pauseOnMouseEnter: true,
                        }}
                        pagination={{ clickable: true }}
                        breakpoints={{
                          500: { slidesPerView: 2, spaceBetween: 16 },
                          768: { slidesPerView: 3, spaceBetween: 20 },
                          1024: { slidesPerView: 5, spaceBetween: 24 },
                        }}
                        className="pb-14 shop-swiper"
                      >
                        {featuredShopProducts.map((p: any) => (
                          <SwiperSlide key={p.id}>
                            <div className="p-1">
                              <ProductCard
                                id={p.slug}
                                name={p.name}
                                price={p.sale_price || p.price}
                                originalPrice={p.sale_price ? p.price : undefined}
                                image={p.images?.[0]?.image_url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400"}
                                category={p.category?.name || "Danh mục"}
                                rating={p.rating_average || 0}
                                sales={p.sold_count}
                                badge="Nổi bật"
                                shop={shop}
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  )}
                </div>
              )}
            </>
         ) : (
           /* OTHER TABS (TẤT CẢ SẢN PHẨM HOẶC DANH MỤC) */
           <div className="space-y-8">
              <div className="flex justify-between items-end flex-wrap gap-4">
                 <div className="space-y-2">
                    <h3 className="text-3xl font-serif font-black uppercase tracking-tighter">
                      {tabs.find(t => t.id === activeTab)?.label || "Sản phẩm"}
                    </h3>
                    <div className="w-20 h-2 bg-black"></div>
                 </div>
                 <div className="flex gap-4 flex-wrap">
                    <div className="flex bg-white border-2 border-black rounded-xl p-1 shadow-subtle">
                       {[
                         { label: "Mới nhất", id: "newest" },
                         { label: "Bán chạy", id: "best_sellers" },
                         { label: "Giá thấp", id: "price_asc" },
                         { label: "Giá cao", id: "price_desc" }
                       ].map((sort) => (
                         <button 
                           key={sort.id} 
                           type="button" 
                           onClick={() => setSortType(sort.id)}
                           className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${sortType === sort.id ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                         >
                           {sort.label}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              {searchKeyword && (
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Kết quả tìm kiếm cho: <span className="text-black font-black">"{searchKeyword}"</span>
                  <button type="button" onClick={() => { setSearchKeyword(""); setSearchVal(""); }} className="text-red-500 hover:text-red-700 ml-2">Xóa</button>
                </div>
              )}

              {isLoadingFilteredProducts ? (
                <div className="text-center py-20">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-primary rounded-full"></div>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                   {filteredProducts.map((p: any) => (
                      <ProductCard
                        key={p.id}
                        id={p.slug}
                        name={p.name}
                        price={p.sale_price || p.price}
                        originalPrice={p.sale_price ? p.price : undefined}
                        image={p.images?.[0]?.image_url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400"}
                        category={p.category?.name || "Danh mục"}
                        rating={p.rating_average || 0}
                        sales={p.sold_count}
                        badge={p.is_new ? "Mới" : p.sold_count > 15 ? "Hot" : undefined}
                        shop={shop}
                      />
                   ))}
                </div>
              ) : (
                <div className="bg-white border-2 border-black rounded-3xl p-12 text-center text-gray-400 font-bold">
                  Không tìm thấy sản phẩm nào trong mục này
                </div>
              )}
           </div>
         )}
      </main>

      {/* 6. FOOTER MINI (Shop Info) */}
      <footer className="mt-20 border-t-2 border-black/5 pt-20 pb-10 bg-white">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="col-span-1 md:col-span-2 space-y-6">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-black">UT</div>
                  <h3 className="text-2xl font-serif font-black uppercase tracking-tighter">{shop.shop_name || shop.name}</h3>
               </div>
               <p className="text-gray-500 text-sm max-w-md leading-relaxed">
                  Chúng tôi mang đến những giải pháp thời trang tối giản nhưng đầy cá tính. Mỗi sản phẩm đều được chăm chút kỹ lưỡng từ chất liệu đến đường may để mang lại trải nghiệm tốt nhất cho bạn.
               </p>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase">
                     <ShieldCheck size={18} className="text-primary" /> 100% Chính hãng
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase">
                     <ShieldCheck size={18} className="text-primary" /> 15 ngày đổi trả
                  </div>
               </div>
            </div>
            <div className="space-y-4">
               <h5 className="font-black uppercase text-xs tracking-widest">Danh mục của shop</h5>
               <ul className="space-y-2 text-sm font-medium text-gray-500">
                  {shopCategories.slice(0, 4).map(cat => (
                    <li 
                      key={cat.slug} 
                      onClick={() => setActiveTab(cat.slug)}
                      className="hover:text-black transition-colors cursor-pointer underline underline-offset-4"
                    >
                      {cat.name}
                    </li>
                  ))}
                  {shopCategories.length === 0 && (
                    <>
                      <li className="hover:text-black transition-colors cursor-pointer underline underline-offset-4">Áo khoác Heritage</li>
                      <li className="hover:text-black transition-colors cursor-pointer underline underline-offset-4">Sơ mi Linen</li>
                      <li className="hover:text-black transition-colors cursor-pointer underline underline-offset-4">Quần Tây Minimal</li>
                    </>
                  )}
               </ul>
            </div>
            <div className="space-y-4 text-left md:text-right">
               <h5 className="font-black uppercase text-xs tracking-widest">Địa chỉ cửa hàng</h5>
               <p className="text-sm font-medium text-gray-500">
                  {shop.address || "Số 1, Võ Văn Ngân, TP. Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam"}
               </p>
               <div className="flex justify-start md:justify-end gap-3 pt-4">
                  <div className="w-10 h-10 border-2 border-black rounded-lg flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-all"><Users size={18}/></div>
                  <div className="w-10 h-10 border-2 border-black rounded-lg flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-all"><Store size={18}/></div>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
};

const tabs: Array<{ id: string, label: string }> = [];

export default VendorShopPage;
