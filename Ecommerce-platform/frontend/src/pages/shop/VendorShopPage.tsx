import React, { useState, useMemo, useEffect, useRef } from "react";
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
  ChevronDown,
  Sparkles,
  Flame,
  Ticket,
  Award,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [sortType, setSortType] = useState("newest");
  const [searchVal, setSearchVal] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [swiperPromoRef, setSwiperPromoRef] = useState<any>(null);
  const [swiperBestSellerRef, setSwiperBestSellerRef] = useState<any>(null);
  const [swiperFeaturedRef, setSwiperFeaturedRef] = useState<any>(null);

  const queryClient = useQueryClient();
  const { mutate: saveCoupon } = useSaveCoupon();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Lấy thông tin chi tiết Shop
  const { data: shopProfileRes, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ["shop-profile", id, isAuthenticated],
    queryFn: () => vendorService.getShopProfile(id!),
    enabled: !!id,
  });
  const shop = shopProfileRes?.data;

  const isFollowed = Boolean(shop?.is_followed ?? shop?.isFollowed);
  const followersCount = Number(shop?.followers_count ?? shop?.followersCount ?? 0);

  const { mutate: toggleFollow, isPending: isTogglingFollow } = useMutation({
    mutationFn: () => vendorService.toggleFollowShop(id!),
    onSuccess: (res) => {
      const nextFollowed = Boolean(res?.data?.isFollowed ?? res?.data?.is_followed);
      const nextCount = Number(res?.data?.followersCount ?? res?.data?.followers_count ?? 0);
      queryClient.setQueryData(["shop-profile", id, isAuthenticated], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            is_followed: nextFollowed,
            isFollowed: nextFollowed,
            followers_count: nextCount,
            followersCount: nextCount,
          },
        };
      });
      toast.success(
        nextFollowed
          ? "Đã theo dõi gian hàng!"
          : "Đã bỏ theo dõi gian hàng."
      );
    },
    onError: () => {
      toast.error("Không thể cập nhật trạng thái theo dõi. Vui lòng thử lại.");
    },
  });

  const handleFollowClick = () => {
    if (!isAuthenticated) {
      navigate("/auth/login?redirect=" + window.location.pathname);
      return;
    }
    toggleFollow();
  };

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
          {t("shop_loading")}
        </h2>
      </div>
    );
  }

  if (profileError || !shop) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
        <AlertTriangle className="w-14 h-14 mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          {t("shop_not_found")}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {t("shop_not_found_desc")}
        </p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-2.5 bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
        >
          {t("back_to_shopping")}
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
                  {t("preferred_label")}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 max-w-md">
                {shop.description || "Chào mừng bạn đến với gian hàng chính hãng tại MeeMart."}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isTogglingFollow}
                  onClick={handleFollowClick}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60 ${
                    isFollowed
                      ? "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600"
                      : "bg-[#ee4d2d] hover:bg-[#d03e1e] text-white shadow-xs"
                  }`}
                >
                  {isFollowed ? (
                    <>
                      <Check size={13} />
                      <span>{t("following_label")}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>{t("follow_label")}</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700 md:pl-6 text-center sm:text-left">
            <div>
              <span className="text-[11px] text-gray-400 block">{t("rating")}</span>
              <span className="text-sm font-bold text-[#ee4d2d]">
                {shop.rating ? `${Number(shop.rating).toFixed(1)}/5` : "4.9/5"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block">{t("followers_count")}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {followersCount.toLocaleString("vi-VN")}
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
              <span>{t("shop_voucher_title")}</span>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-1 sm:py-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("home");
                setSearchKeyword("");
                setSearchVal("");
                setIsCategoryMenuOpen(false);
              }}
              className={`px-3.5 sm:px-4 py-3 text-xs sm:text-[13px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                activeTab === "home"
                  ? "border-[#ee4d2d] text-[#ee4d2d]"
                  : "border-transparent text-gray-600 dark:text-slate-400 hover:text-[#ee4d2d]"
              }`}
            >
              {t("shop_home")}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setSearchKeyword("");
                setSearchVal("");
                setIsCategoryMenuOpen(false);
              }}
              className={`px-3.5 sm:px-4 py-3 text-xs sm:text-[13px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                activeTab === "all"
                  ? "border-[#ee4d2d] text-[#ee4d2d]"
                  : "border-transparent text-gray-600 dark:text-slate-400 hover:text-[#ee4d2d]"
              }`}
            >
              {t("all_products")}
            </button>

            {shopCategories.length > 0 && (
              <div className="relative" ref={categoryMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                  className={`px-3.5 sm:px-4 py-3 text-xs sm:text-[13px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap cursor-pointer border-b-2 flex items-center gap-1.5 ${
                    activeTab !== "home" && activeTab !== "all"
                      ? "border-[#ee4d2d] text-[#ee4d2d]"
                      : "border-transparent text-gray-600 dark:text-slate-400 hover:text-[#ee4d2d]"
                  }`}
                >
                  <span>
                    {activeTab !== "home" && activeTab !== "all"
                      ? shopCategories.find((c) => c.slug === activeTab)?.name || t("shop_categories_tab")
                      : t("shop_categories_tab")}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${isCategoryMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isCategoryMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 z-50">
                    {shopCategories.map((cat) => {
                      const isSelected = activeTab === cat.slug;
                      return (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => {
                            setActiveTab(cat.slug);
                            setSearchKeyword("");
                            setSearchVal("");
                            setIsCategoryMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs sm:text-[13px] font-medium transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-[#fef0ed] dark:bg-[#ee4d2d]/15 text-[#ee4d2d] font-bold"
                              : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          {isSelected && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72 md:w-80 lg:w-96 pb-2 sm:py-2 shrink-0">
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={t("shop_search_placeholder")}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-2 text-xs sm:text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:border-[#ee4d2d] focus:ring-1 focus:ring-[#ee4d2d]/30 transition-all"
            />
            <button
              type="submit"
              aria-label="Tìm kiếm trong gian hàng"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-7 flex items-center justify-center bg-[#ee4d2d] hover:bg-[#d03e1e] text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Search size={15} />
            </button>
          </form>
        </div>
      </section>

      {/* 4. SHOP CONTENT */}
      <main className="px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        {activeTab === "home" ? (
          <>
            {/* Banner nổi bật + Top bán chạy */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:items-stretch">
              {/* Banner Lookbook (8/12) */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-2xl overflow-hidden relative group shadow-xs min-h-[280px] lg:h-[340px] flex items-end">
                <img
                  src={shop.cover_url || "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1200"}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt="Shop Lookbook"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10 p-6 sm:p-8 text-white space-y-2.5">
                  <span className="bg-[#ee4d2d] text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-block">
                    {t("new_arrivals_label")}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    {shop.shop_name || shop.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="px-5 py-2.5 bg-white text-gray-900 rounded-lg font-bold text-xs sm:text-sm hover:bg-[#ee4d2d] hover:text-white transition-colors shadow-sm cursor-pointer mt-2"
                  >
                    {t("explore_all_products")}
                  </button>
                </div>
              </div>

              {/* Hot Products Column (4/12) */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-4 lg:h-[340px]">
                {bestSellers.map((p: any, i: number) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/products/${p.slug}`)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-2xl p-4 shadow-xs flex items-center gap-4 cursor-pointer hover:border-[#ee4d2d]/60 hover:shadow-md transition-all group"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-900 shrink-0 border border-gray-100 dark:border-slate-700">
                      <img
                        src={p.images?.[0]?.image_url || "/placeholder.jpg"}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] text-[11px] font-extrabold px-2 py-0.5 rounded">
                          TOP {i + 1}
                        </span>
                        {p.sold_count > 0 && (
                          <span className="text-[11px] text-gray-400 dark:text-slate-400">
                            Đã bán {p.sold_count}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 line-clamp-2 group-hover:text-[#ee4d2d] transition-colors">
                        {p.name}
                      </h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-[#ee4d2d]">
                          {formatPrice(p.sale_price || p.price)}
                        </span>
                        {p.sale_price && Number(p.sale_price) < Number(p.price) && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(p.price)}
                          </span>
                        )}
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
                    <span>{t("hot_promotions")}</span>
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
                  rewind={true}
                  speed={700}
                  autoplay={{
                    delay: 2800,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }}
                  pagination={{ clickable: true, dynamicBullets: true }}
                  breakpoints={{
                    640: { slidesPerView: 3, spaceBetween: 14 },
                    768: { slidesPerView: 4, spaceBetween: 16 },
                    1024: { slidesPerView: 5, spaceBetween: 16 },
                  }}
                  className="pb-8"
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
                    <span>{t("best_selling_products")}</span>
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
                  rewind={true}
                  speed={700}
                  autoplay={{
                    delay: 3200,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }}
                  pagination={{ clickable: true, dynamicBullets: true }}
                  breakpoints={{
                    640: { slidesPerView: 3, spaceBetween: 14 },
                    768: { slidesPerView: 4, spaceBetween: 16 },
                    1024: { slidesPerView: 5, spaceBetween: 16 },
                  }}
                  className="pb-8"
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

            {featuredShopProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <Award size={16} className="text-[#ee4d2d]" />
                    <span>Sản phẩm nổi bật</span>
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => swiperFeaturedRef?.slidePrev()}
                      className="p-1 rounded-md border border-gray-200 dark:border-slate-700 hover:text-[#ee4d2d] transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => swiperFeaturedRef?.slideNext()}
                      className="p-1 rounded-md border border-gray-200 dark:border-slate-700 hover:text-[#ee4d2d] transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <Swiper
                  onSwiper={setSwiperFeaturedRef}
                  modules={[Pagination, Autoplay]}
                  spaceBetween={14}
                  slidesPerView={2}
                  rewind={true}
                  speed={700}
                  autoplay={{
                    delay: 3600,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }}
                  pagination={{ clickable: true, dynamicBullets: true }}
                  breakpoints={{
                    640: { slidesPerView: 3, spaceBetween: 14 },
                    768: { slidesPerView: 4, spaceBetween: 16 },
                    1024: { slidesPerView: 5, spaceBetween: 16 },
                  }}
                  className="pb-8"
                >
                  {featuredShopProducts.map((p: any) => (
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
                        badge="Nổi bật"
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
                  ? t("all_products_title")
                  : shopCategories.find((c) => c.slug === activeTab)?.name || "Danh Mục"}
              </h3>

              {/* Sắp xếp chuẩn Shopee */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium hidden sm:inline">
                  {t("sort_by_label")}
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
                  {t("sort_newest")}
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
                  {t("sort_best_sellers")}
                </button>

                {/* Dropdown sắp xếp Giá */}
                <ShopeeSelect
                  value={sortType.startsWith("price_") ? sortType : ""}
                  onChange={(val) => setSortType(val)}
                  placeholder={t("sort_price")}
                  size="sm"
                  menuWidth="w-40"
                  align="right"
                  buttonClassName={sortType.startsWith("price_") ? "border-[#ee4d2d] text-[#ee4d2d] font-medium" : ""}
                  options={[
                    { value: "price_asc", label: t("price_low_to_high") },
                    { value: "price_desc", label: t("price_high_to_low") },
                  ]}
                />
              </div>
            </div>

            {searchKeyword && (
              <div className="text-xs text-gray-500 dark:text-slate-400">
                <span>{t("search_results_for")} </span>
                <strong className="text-gray-900 dark:text-slate-100">"{searchKeyword}"</strong>
                <button
                  type="button"
                  onClick={() => {
                    setSearchKeyword("");
                    setSearchVal("");
                  }}
                  className="text-red-500 hover:underline ml-2 cursor-pointer"
                >
                  {t("clear_search")}
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
                  {t("no_products_in_section")}
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
