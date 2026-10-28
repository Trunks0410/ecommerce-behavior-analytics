import React, { useState, useMemo } from "react";
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
  ChevronRight,
  Sparkles,
  Flame,
  Ticket,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { vendorService } from "@/services/vendorService";
import { useSaveCoupon } from "@/hooks/useCoupons";
import { useAppSelector } from "@/app/stores/hooks";
import toast from "react-hot-toast";
import ProductCard from "@/shared/components/ui/ProductCard";
import { ShopeeSelect } from "@/shared/components/ui/Dropdown";
import { formatPrice } from "@/shared/utils/format";
import { useLanguage } from "@/shared/context/LanguageContext";

// Swiper imports
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const DEFAULT_SHOP_LOGO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='128' height='128'><rect width='100' height='100' fill='%23FFE4D6' stroke='black' stroke-width='4'/><path d='M20 40 L50 15 L80 40 L80 85 L20 85 Z' fill='white' stroke='black' stroke-width='4'/><rect x='40' y='55' width='20' height='30' fill='%23D97736' stroke='black' stroke-width='4'/><path d='M15 40 L85 40' stroke='black' stroke-width='4'/></svg>";

const VendorShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
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

  // 3. Lấy toàn bộ sản phẩm của Shop
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
      .filter((p: any) => p.is_featured === true || p.is_featured === 1 || p.is_featured === "true")
      .slice(0, 6);
  }, [allProducts]);

  const promoShopProducts = useMemo(() => {
    return allProducts
      .filter((p: any) => p.sale_price !== null && Number(p.sale_price) < Number(p.price))
      .slice(0, 6);
  }, [allProducts]);

  const bestSellerShopProducts = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
      .slice(0, 6);
  }, [allProducts]);

  // 4. Lấy sản phẩm đã qua lọc/sắp xếp/tìm kiếm
  const { data: filteredProductsRes, isLoading: isLoadingFilteredProducts } = useQuery({
    queryKey: ["shop-filtered-products", id, activeTab, sortType, searchKeyword],
    queryFn: () => {
      const params: any = {
        limit: 30,
        sortBy: sortType,
        keyword: searchKeyword || undefined,
      };
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
      setActiveTab("all");
    }
  };

  const getJoinDuration = (createdAt?: string) => {
    if (!createdAt) return "2 năm";
    const diffYears = new Date().getFullYear() - new Date(createdAt).getFullYear();
    return diffYears > 0 ? `${diffYears} năm` : "Mới";
  };

  if (isLoadingProfile || isLoadingAllProducts) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="animate-spin inline-block w-10 h-10 border-4 border-[#ee4d2d] border-t-transparent rounded-full mb-4" />
        <h2 className="text-base font-bold text-gray-700 dark:text-slate-300">
          {language === "vi" ? "Đang tải thông tin cửa hàng..." : "Loading shop profile..."}
        </h2>
      </div>
    );
  }

  if (profileError || !shop) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
        <AlertTriangle className="w-14 h-14 mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          {language === "vi" ? "Không tìm thấy cửa hàng!" : "Shop Not Found!"}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {language === "vi"
            ? "Cửa hàng có thể đã tạm khóa hoặc đường dẫn không đúng."
            : "The shop might be temporarily unavailable or the link is invalid."}
        </p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-2.5 bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
        >
          {language === "vi" ? "Quay lại mua sắm" : "Back to Shopping"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 font-sans pb-20 space-y-6">
      {/* 1. KHỐI THÔNG TIN SHOP (Shopee Mall Style) */}
      <section className="pt-6 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row gap-6 items-center justify-between">
          {/* Left: Profile Information */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 shadow-xs">
                <img
                  src={shop.shop_logo || shop.avatar_url || DEFAULT_SHOP_LOGO}
                  alt={shop.shop_name || "Shop Avatar"}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-[#ee4d2d] text-white px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shadow-xs">
                Official
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                  {shop.shop_name || shop.name}
                </h1>
                <span className="bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] text-[10px] font-bold px-2 py-0.5 rounded">
                  {language === "vi" ? "Yêu thích" : "Preferred"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 max-w-md">
                {shop.description || "Chào mừng bạn đến với gian hàng chính hãng tại MeeMart."}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFollowed(!isFollowed)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isFollowed
                      ? "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                      : "bg-[#ee4d2d] hover:bg-[#d03e1e] text-white shadow-xs"
                  }`}
                >
                  {isFollowed ? (
                    <>
                      <Check size={13} />
                      <span>{language === "vi" ? "Đã theo dõi" : "Following"}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>{language === "vi" ? "Theo dõi" : "Follow"}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("openChat", {
                        detail: {
                          shopId: shop.id,
                          shopName: shop.shop_name || shop.name,
                          shopLogo: shop.shop_logo || shop.avatar_url,
                        },
                      }),
                    )
                  }
                  className="px-4 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-700 dark:text-slate-200 hover:text-[#ee4d2d] hover:border-[#ee4d2d] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>{t("chat_now")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert("Đã sao chép liên kết cửa hàng!");
                  }}
                  className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 hover:text-[#ee4d2d] hover:border-[#ee4d2d] transition-colors cursor-pointer"
                  title="Chia sẻ"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Stats Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700 md:pl-6 text-center sm:text-left">
            <div>
              <span className="text-[11px] text-gray-400 block">{t("rating")}</span>
              <span className="text-sm font-bold text-[#ee4d2d]">
                {shop.rating ? `${Number(shop.rating).toFixed(1)}/5` : "4.9/5"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">{t("products_count")}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {allProducts.length}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">{t("response_rate")}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {shop.response_rate ? `${shop.response_rate}%` : "98%"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">{t("joined")}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {getJoinDuration(shop.created_at)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MÃ GIẢM GIÁ CỦA SHOP (Vouchers) */}
      {vouchers.length > 0 && (
        <section className="px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-slate-200 uppercase">
              <Ticket size={14} className="text-[#ee4d2d]" />
              <span>{language === "vi" ? "Voucher Khuyến Mãi Của Shop" : "Shop Promo Vouchers"}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {vouchers.map((v: any) => (
                <div
                  key={v.id}
                  className="bg-[#fef0ed] dark:bg-[#ee4d2d]/10 border border-dashed border-[#ee4d2d]/60 rounded-xl p-3 min-w-[220px] flex items-center justify-between gap-3 shrink-0"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-[#ee4d2d] block">
                      {v.discount_type === "PERCENTAGE" ? `Giảm ${v.discount_value}%` : `Giảm ${formatPrice(v.discount_value)}`}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 block">
                      Đơn tối thiểu {formatPrice(v.min_order_value || 0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={v.isSaved}
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate("/auth/login?redirect=" + window.location.pathname);
                        return;
                      }
                      saveCoupon(v.id, {
                        onSuccess: () => toast.success("Đã lưu mã giảm giá thành công!"),
                      });
                    }}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      v.isSaved
                        ? "bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed"
                        : "bg-[#ee4d2d] hover:bg-[#d03e1e] text-white shadow-xs"
                    }`}
                  >
                    {v.isSaved ? "Đã lưu" : "Lưu mã"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. THANH ĐIỀU HƯỚNG TABS SHOP */}
      <section className="sticky top-16 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "home", label: language === "vi" ? "Trang chủ Shop" : "Shop Home" },
              { id: "all", label: language === "vi" ? "Tất cả sản phẩm" : "All Products" },
              ...shopCategories.map((cat) => ({ id: cat.slug, label: cat.name })),
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchKeyword("");
                    setSearchVal("");
                  }}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                    isActive
                      ? "border-[#ee4d2d] text-[#ee4d2d]"
                      : "border-transparent text-gray-600 dark:text-slate-400 hover:text-[#ee4d2d]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-48 sm:w-64 py-1.5 hidden sm:block">
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={language === "vi" ? "Tìm tại shop này..." : "Search in shop..."}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:border-[#ee4d2d]"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          </form>
        </div>
      </section>

      {/* 4. SHOP CONTENT */}
      <main className="px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        {activeTab === "home" ? (
          <>
            {/* Banner nổi bật + Top bán chạy */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Banner Lookbook (8/12) */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-2xl overflow-hidden relative group shadow-xs min-h-[300px] flex items-end">
                <img
                  src={shop.cover_url || "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1200"}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt="Shop Lookbook"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10 p-6 sm:p-8 text-white space-y-2">
                  <span className="bg-[#ee4d2d] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block">
                    {language === "vi" ? "BỘ SƯU TẬP MỚI" : "NEW ARRIVALS"}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    {shop.shop_name || shop.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="px-5 py-2 bg-white text-gray-900 rounded-lg font-bold text-xs hover:bg-[#ee4d2d] hover:text-white transition-colors shadow-sm cursor-pointer mt-2"
                  >
                    {language === "vi" ? "Khám phá tất cả sản phẩm" : "Explore All Products"}
                  </button>
                </div>
              </div>

              {/* Hot Products Column (4/12) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {bestSellers.map((p: any, i: number) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/products/${p.slug}`)}
                    className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-xl p-3.5 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-[#ee4d2d]/60 transition-colors group"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900 shrink-0 border border-gray-100 dark:border-slate-700">
                      <img
                        src={p.images?.[0]?.image_url || "/placeholder.jpg"}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span className="bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] text-[10px] font-bold px-1.5 py-0.5 rounded">
                        TOP {i + 1}
                      </span>
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate group-hover:text-[#ee4d2d]">
                        {p.name}
                      </h4>
                      <div className="text-xs font-bold text-[#ee4d2d]">
                        {formatPrice(p.sale_price || p.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Các hàng Swiper sản phẩm: Khuyến mãi, Bán chạy, Nổi bật */}
            {promoShopProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <Flame size={16} className="text-[#ee4d2d]" />
                    <span>{language === "vi" ? "Khuyến Mãi Cực Hời" : "Hot Promotions"}</span>
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => swiperPromoRef?.slidePrev()}
                      className="p-1 rounded-md border border-gray-200 dark:border-slate-700 hover:text-[#ee4d2d] transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => swiperPromoRef?.slideNext()}
                      className="p-1 rounded-md border border-gray-200 dark:border-slate-700 hover:text-[#ee4d2d] transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <Swiper
                  onSwiper={setSwiperPromoRef}
                  modules={[Pagination, Autoplay]}
                  spaceBetween={14}
                  slidesPerView={2}
                  breakpoints={{
                    640: { slidesPerView: 3, spaceBetween: 14 },
                    768: { slidesPerView: 4, spaceBetween: 16 },
                    1024: { slidesPerView: 5, spaceBetween: 16 },
                  }}
                  className="pb-6"
                >
                  {promoShopProducts.map((p: any) => (
                    <SwiperSlide key={p.id}>
                      <ProductCard
                        id={p.slug}
                        name={p.name}
                        price={p.sale_price || p.price}
                        originalPrice={p.sale_price ? p.price : undefined}
                        image={p.images?.[0]?.image_url || "/placeholder.jpg"}
                        category={p.category?.name || "MeeMart"}
                        rating={p.rating_average || 5}
                        sales={p.sold_count}
                        badge="Sale"
                        shop={shop}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}

            {bestSellerShopProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>{language === "vi" ? "Sản Phẩm Bán Chạy" : "Best Selling Products"}</span>
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => swiperBestSellerRef?.slidePrev()}
                      className="p-1 rounded-md border border-gray-200 dark:border-slate-700 hover:text-[#ee4d2d] transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => swiperBestSellerRef?.slideNext()}
                      className="p-1 rounded-md border border-gray-200 dark:border-slate-700 hover:text-[#ee4d2d] transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <Swiper
                  onSwiper={setSwiperBestSellerRef}
                  modules={[Pagination, Autoplay]}
                  spaceBetween={14}
                  slidesPerView={2}
                  breakpoints={{
                    640: { slidesPerView: 3, spaceBetween: 14 },
                    768: { slidesPerView: 4, spaceBetween: 16 },
                    1024: { slidesPerView: 5, spaceBetween: 16 },
                  }}
                  className="pb-6"
                >
                  {bestSellerShopProducts.map((p: any) => (
                    <SwiperSlide key={p.id}>
                      <ProductCard
                        id={p.slug}
                        name={p.name}
                        price={p.sale_price || p.price}
                        originalPrice={p.sale_price ? p.price : undefined}
                        image={p.images?.[0]?.image_url || "/placeholder.jpg"}
                        category={p.category?.name || "MeeMart"}
                        rating={p.rating_average || 5}
                        sales={p.sold_count}
                        badge="Hot"
                        shop={shop}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </>
        ) : (
          /* TAB TẤT CẢ SẢN PHẨM HOẶC THEO DANH MỤC */
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-800 border border-black/[0.06] dark:border-slate-700/60 rounded-xs sm:rounded-sm p-3.5 sm:p-4 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                {activeTab === "all"
                  ? (language === "vi" ? "Tất Cả Sản Phẩm" : "All Products")
                  : shopCategories.find((c) => c.slug === activeTab)?.name || "Danh Mục"}
              </h3>

              {/* Sắp xếp chuẩn Shopee */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium hidden sm:inline">
                  {language === "vi" ? "Sắp xếp theo:" : "Sort by:"}
                </span>

                <button
                  type="button"
                  onClick={() => setSortType("newest")}
                  className={`px-3.5 py-1.5 rounded-xs text-xs font-medium transition-colors cursor-pointer ${
                    sortType === "newest"
                      ? "bg-[#ee4d2d] text-white shadow-xs"
                      : "bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {language === "vi" ? "Mới nhất" : "Newest"}
                </button>

                <button
                  type="button"
                  onClick={() => setSortType("best_sellers")}
                  className={`px-3.5 py-1.5 rounded-xs text-xs font-medium transition-colors cursor-pointer ${
                    sortType === "best_sellers"
                      ? "bg-[#ee4d2d] text-white shadow-xs"
                      : "bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {language === "vi" ? "Bán chạy" : "Best Sellers"}
                </button>

                {/* Dropdown sắp xếp Giá */}
                <ShopeeSelect
                  value={sortType.startsWith("price_") ? sortType : ""}
                  onChange={(val) => setSortType(val)}
                  placeholder={language === "vi" ? "Giá" : "Price"}
                  size="sm"
                  menuWidth="w-40"
                  align="right"
                  buttonClassName={sortType.startsWith("price_") ? "border-[#ee4d2d] text-[#ee4d2d] font-medium" : ""}
                  options={[
                    { value: "price_asc", label: language === "vi" ? "Giá: Thấp đến Cao" : "Price: Low to High" },
                    { value: "price_desc", label: language === "vi" ? "Giá: Cao đến Thấp" : "Price: High to Low" },
                  ]}
                />
              </div>
            </div>

            {searchKeyword && (
              <div className="text-xs text-gray-500 dark:text-slate-400">
                <span>{language === "vi" ? "Kết quả tìm kiếm cho:" : "Search results for:"} </span>
                <strong className="text-gray-900 dark:text-slate-100">"{searchKeyword}"</strong>
                <button
                  type="button"
                  onClick={() => {
                    setSearchKeyword("");
                    setSearchVal("");
                  }}
                  className="text-red-500 hover:underline ml-2 cursor-pointer"
                >
                  {language === "vi" ? "Xóa tìm kiếm" : "Clear"}
                </button>
              </div>
            )}

            {isLoadingFilteredProducts ? (
              <div className="text-center py-20">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-[#ee4d2d] border-t-transparent rounded-full" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {filteredProducts.map((p: any) => (
                  <ProductCard
                    key={p.id}
                    id={p.slug}
                    name={p.name}
                    price={p.sale_price || p.price}
                    originalPrice={p.sale_price ? p.price : undefined}
                    image={p.images?.[0]?.image_url || "/placeholder.jpg"}
                    category={p.category?.name || "MeeMart"}
                    rating={p.rating_average || 5}
                    sales={p.sold_count}
                    badge={p.is_new ? "Mới" : p.sold_count > 15 ? "Hot" : undefined}
                    shop={shop}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-xl p-12 text-center text-gray-400 space-y-1">
                <p className="text-xs font-bold text-gray-600 dark:text-slate-300">
                  {language === "vi" ? "Không tìm thấy sản phẩm nào trong mục này." : "No products found in this section."}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorShopPage;
