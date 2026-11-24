import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "@/shared/components/ui/ProductCard";
import HeroSection from "@/shared/components/home/HeroSection";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Clock,
  Shirt,
  Sparkles,
  Glasses,
  ShoppingBag,
  Layers,
  Gift,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Smartphone,
  ShoppingBasket,
  Backpack,
  Home,
  HeartPulse,
  BookOpen,
  Watch,
  Footprints,
  Laptop,
  Dumbbell,
} from "lucide-react";
import {
  useCategories,
  useFeaturedProducts,
  useNewestProducts,
  useBestSellerProducts,
  useMostViewedProducts,
  useRecommendedProducts,
} from "@/hooks/useProducts";
import { useLanguage } from "@/shared/context/LanguageContext";

const CATEGORY_COLORS = [
  "bg-blue-50 dark:bg-blue-950/40",
  "bg-pink-50 dark:bg-pink-950/40",
  "bg-purple-50 dark:bg-purple-950/40",
  "bg-amber-50 dark:bg-amber-950/40",
  "bg-rose-50 dark:bg-rose-950/40",
  "bg-emerald-50 dark:bg-emerald-950/40",
  "bg-teal-50 dark:bg-teal-950/40",
  "bg-sky-50 dark:bg-sky-950/40",
  "bg-orange-50 dark:bg-orange-950/40",
  "bg-indigo-50 dark:bg-indigo-950/40",
];

const normalizeCategoryText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const getCategoryIcon = (slug = "", name = "") => {
  const s = normalizeCategoryText(`${slug} ${name}`);

  if (s.includes("dien thoai") || s.includes("dien-thoai") || s.includes("phone")) {
    return <Smartphone size={22} className="text-sky-500" />;
  }
  if (s.includes("laptop") || s.includes("may tinh") || s.includes("may-tinh") || s.includes("dien tu") || s.includes("electronic")) {
    return <Laptop size={22} className="text-violet-500" />;
  }
  if (s.includes("bach hoa") || s.includes("bach-hoa") || s.includes("thuc pham") || s.includes("thuc-pham") || s.includes("do an") || s.includes("grocery") || s.includes("food")) {
    return <ShoppingBasket size={22} className="text-orange-500" />;
  }
  if (s.includes("balo") || s.includes("tui") || s.includes("vi") || s.includes("cap") || s.includes("bag") || s.includes("backpack")) {
    return <Backpack size={22} className="text-amber-600 dark:text-amber-400" />;
  }
  if (s.includes("nha cua") || s.includes("nha-cua") || s.includes("doi song") || s.includes("doi-song") || s.includes("noi that") || s.includes("home") || s.includes("living")) {
    return <Home size={22} className="text-teal-500" />;
  }
  if (s.includes("sac dep") || s.includes("sac-dep") || s.includes("suc khoe") || s.includes("suc-khoe") || s.includes("my pham") || s.includes("beauty") || s.includes("health")) {
    return <HeartPulse size={22} className="text-rose-500" />;
  }
  if (s.includes("van phong pham") || s.includes("van-phong-pham") || s.includes("sach") || s.includes("book") || s.includes("stationery")) {
    return <BookOpen size={22} className="text-indigo-500" />;
  }
  if (s.includes("giay") || s.includes("dep") || s.includes("shoe") || s.includes("heel")) {
    return <Footprints size={22} className="text-cyan-500" />;
  }
  if (s.includes("the thao") || s.includes("the-thao") || s.includes("sport")) {
    return <Dumbbell size={22} className="text-emerald-500" />;
  }
  if (s.includes("phu kien") || s.includes("phu-kien") || s.includes("dong ho") || s.includes("trang suc") || s.includes("kinh") || s.includes("watch")) {
    return <Watch size={22} className="text-purple-500" />;
  }
  if (s.includes("non") || s.includes("mu") || s.includes("hat")) {
    return <Glasses size={22} className="text-purple-500" />;
  }
  if (s.includes("dam") || s.includes("vay") || s.includes("thoi trang nu") || s.includes("thoi-trang-nu") || s.includes("nu") || s.includes("dress") || s.includes("women")) {
    return <Sparkles size={22} className="text-pink-500" />;
  }
  if (s.includes("ao") || s.includes("so mi") || s.includes("so-mi") || s.includes("thoi trang nam") || s.includes("thoi-trang-nam") || s.includes("nam") || s.includes("shirt") || s.includes("men")) {
    return <Shirt size={22} className="text-blue-500" />;
  }
  return <Layers size={22} className="text-emerald-500" />;
};

const HomePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: categoryList = [], isLoading: isLoadingCategories } = useCategories();
  const { data: featuredProducts = [] } = useFeaturedProducts();
  const { data: newestProducts = [] } = useNewestProducts();
  const { data: bestSellers = [] } = useBestSellerProducts();
  const { data: mostViewed = [] } = useMostViewedProducts();
  const { data: personalizedProducts = [] } = useRecommendedProducts(18);

  const displayCategories = (() => {
    if (!categoryList || categoryList.length === 0) return [];
    const roots = categoryList.filter((c: any) => !c.parent_id);
    const children = categoryList.filter((c: any) => c.parent_id);
    return [...roots, ...children].slice(0, 10);
  })();

  // Flash Sale Countdown Timer (Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({
    hours: 1,
    minutes: 24,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 2, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDigits = (n: number) => n.toString().padStart(2, "0");

  // Format products for Flash Sale
  const [flashSaleSwiperRef, setFlashSaleSwiperRef] = useState<any>(null);

  const flashSaleItems = (bestSellers.length > 0 ? bestSellers : featuredProducts)
    .slice(0, 10)
    .map((item: any, idx: number) => {
      const discountRatio = 0.25 + (idx % 3) * 0.08;
      const original = item.price ? Number(item.price) : 500000;
      const sale = item.sale_price ? Number(item.sale_price) : Math.round(original * (1 - discountRatio));
      return {
        ...item,
        price: sale,
        originalPrice: original,
        isFlashSale: true,
      };
    });

  // Combine daily recommendations (ưu tiên sản phẩm cá nhân hóa lên đầu giống Shopee Gợi ý hôm nay)
  const recommendationItems = [
    ...personalizedProducts,
    ...featuredProducts,
    ...newestProducts,
    ...mostViewed,
  ];

  // Remove duplicates by id or slug, then interleave by category so diverse categories appear together
  const dedupedRecommendations = Array.from(
    new Map(recommendationItems.map((p: any) => [p.slug || p.id, p])).values()
  );

  const uniqueRecommendations = (() => {
    const buckets = new Map<string, any[]>();
    for (const p of dedupedRecommendations) {
      const catKey = String(p.category_id || p.category?.id || p.category?.slug || "other");
      if (!buckets.has(catKey)) buckets.set(catKey, []);
      buckets.get(catKey)!.push(p);
    }
    const queues = Array.from(buckets.values());
    const interleaved: any[] = [];
    let hasMore = true;
    while (hasMore && interleaved.length < 18) {
      hasMore = false;
      for (const q of queues) {
        if (q.length > 0 && interleaved.length < 18) {
          interleaved.push(q.shift());
          hasMore = true;
        }
      }
    }
    return interleaved;
  })();

  const [visibleCount, setVisibleCount] = useState(12);

  const [copiedVoucher, setCopiedVoucher] = useState(false);

  const handleCopyVoucher = () => {
    navigator.clipboard?.writeText("MEEMART50K");
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2500);
  };

  const handleLoadMore = () => {
    window.scrollTo(0, 0);
    navigate("/daily-discover");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 0. THANH THÔNG BÁO ƯU ĐÃI CHẠY NGANG (MARQUEE TICKER) */}
      <div className="bg-gradient-to-r from-[#ee4d2d] via-[#f97316] to-[#ee4d2d] text-white text-xs font-semibold py-2 overflow-hidden shadow-xs">
        <div className="animate-marquee flex items-center gap-10 whitespace-nowrap">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-10">
              <span className="inline-flex items-center gap-1.5">
                <Zap size={13} className="fill-amber-200 text-amber-200" />
                FLASH SALE GIỜ VÀNG — GIẢM SỐC ĐẾN 50%
              </span>
              <span className="opacity-60">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Truck size={13} />
                FREESHIP TOÀN QUỐC CHO ĐƠN HÀNG TỪ 0Đ
              </span>
              <span className="opacity-60">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Gift size={13} />
                NHẬP MÃ <strong className="bg-white/20 px-1.5 py-0.5 rounded font-mono">MEEMART50K</strong> GIẢM NGAY 50.000Đ
              </span>
              <span className="opacity-60">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={13} />
                HÀNG CHÍNH HÃNG 100% — ĐỔI TRẢ MIỄN PHÍ 7 NGÀY
              </span>
              <span className="opacity-60">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* 1. HERO BANNER SECTION (2/3 Carousel + 1/3 Two Cards) */}
      <HeroSection />

      {/* 2. DANH MỤC PHỔ BIẾN (POPULAR CATEGORIES) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight">
              {t("popular_categories")}
            </h2>
            <Link
              to="/products"
              className="text-xs text-[#ee4d2d] hover:underline font-semibold flex items-center gap-0.5"
            >
              <span>{t("view_all")}</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3">
            {isLoadingCategories && displayCategories.length === 0 ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center animate-pulse">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 mb-2" />
                  <div className="h-3 w-10 bg-slate-100 dark:bg-slate-700 rounded" />
                </div>
              ))
            ) : (
              displayCategories.map((cat: any, idx: number) => (
                <Link
                  key={cat.id || idx}
                  to={`/products?category=${cat.slug}`}
                  className="flex flex-col items-center group text-center transition-transform duration-300 hover:-translate-y-1.5"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md group-hover:ring-2 group-hover:ring-[#ee4d2d]/30 border border-black/5 dark:border-white/5 mb-2 overflow-hidden`}
                  >
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      getCategoryIcon(cat.slug, cat.name)
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs text-gray-700 dark:text-slate-300 font-medium group-hover:text-[#ee4d2d] transition-colors line-clamp-1">
                    {cat.name}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. FLASH SALE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700/60 shadow-xs">
          {/* Header Row with Countdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[#ee4d2d]">
                <Flame size={22} className="fill-[#ee4d2d] animate-flash-glow" />
                <span className="text-lg sm:text-xl font-black uppercase tracking-tight">
                  {t("flash_sale_title")}
                </span>
              </div>

              {/* Countdown Digits */}
              <div className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-slate-300 ml-2">
                <span className="hidden sm:inline uppercase text-[11px] tracking-wider text-gray-500">
                  {t("ends_in")}
                </span>
                <span className="bg-black text-white dark:bg-slate-700 dark:text-slate-100 px-1.5 py-0.5 rounded-sm font-mono shadow-2xs">
                  {formatDigits(timeLeft.hours)}
                </span>
                <span className="animate-pulse font-black text-[#ee4d2d]">:</span>
                <span className="bg-black text-white dark:bg-slate-700 dark:text-slate-100 px-1.5 py-0.5 rounded-sm font-mono shadow-2xs">
                  {formatDigits(timeLeft.minutes)}
                </span>
                <span className="animate-pulse font-black text-[#ee4d2d]">:</span>
                <span className="bg-black text-white dark:bg-slate-700 dark:text-slate-100 px-1.5 py-0.5 rounded-sm font-mono shadow-2xs">
                  {formatDigits(timeLeft.seconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {flashSaleItems.length > 0 && (
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => flashSaleSwiperRef?.slidePrev()}
                    className="p-1 rounded-md border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-[#ee4d2d] hover:border-[#ee4d2d] transition-colors cursor-pointer"
                    aria-label="Flash sale trước"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => flashSaleSwiperRef?.slideNext()}
                    className="p-1 rounded-md border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-[#ee4d2d] hover:border-[#ee4d2d] transition-colors cursor-pointer"
                    aria-label="Flash sale tiếp"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
              <Link
                to="/products?flash_sale=true"
                className="text-xs text-[#ee4d2d] hover:underline font-semibold flex items-center gap-0.5"
              >
                <span>{t("view_more")}</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Product Cards Auto-Scrolling Carousel */}
          {flashSaleItems.length > 0 ? (
            <Swiper
              onSwiper={setFlashSaleSwiperRef}
              modules={[Autoplay]}
              spaceBetween={14}
              slidesPerView={2}
              rewind={true}
              speed={700}
              autoplay={{
                delay: 2800,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              breakpoints={{
                640: { slidesPerView: 3, spaceBetween: 14 },
                768: { slidesPerView: 4, spaceBetween: 16 },
                1024: { slidesPerView: 6, spaceBetween: 16 },
              }}
              className="py-1"
            >
              {flashSaleItems.map((product: any) => (
                <SwiperSlide key={product.id} className="h-auto">
                  <div className="transition-transform duration-300 hover:-translate-y-1">
                    <ProductCard
                      id={product.slug || String(product.id)}
                      name={product.name}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      image={
                        product.images?.[0]?.image_url ||
                        product.thumbnail ||
                        "/placeholder.jpg"
                      }
                      category={product.category?.name || "Flash Sale"}
                      rating={Number(product.rating || product.average_rating || 4.9)}
                      sales={Number(product.sold_count || product.sales_count || 120)}
                      badge="Sale"
                      isFlashSale={true}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              Đang cập nhật sản phẩm Flash Sale...
            </div>
          )}
        </div>
      </section>

      {/* 4. FOUR TRUST BADGES ROW (100% Chính hãng, Freeship, Đổi trả 7 ngày, Giao nhanh 2H) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1 */}
          <div className="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/60 shadow-xs flex items-center gap-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#ee4d2d]/30">
            <div className="w-11 h-11 rounded-full bg-[#fef0ed] dark:bg-rose-950/40 text-[#ee4d2d] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ee4d2d] group-hover:text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">
                {t("trust_authentic")}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                {t("trust_authentic_desc")}
              </p>
            </div>
          </div>

          {/* 2 */}
          <div className="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/60 shadow-xs flex items-center gap-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#ee4d2d]/30">
            <div className="w-11 h-11 rounded-full bg-[#fef0ed] dark:bg-orange-950/40 text-[#ee4d2d] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ee4d2d] group-hover:text-white">
              <Truck size={22} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">
                {t("trust_freeship")}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                {t("trust_freeship_desc")}
              </p>
            </div>
          </div>

          {/* 3 */}
          <div className="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/60 shadow-xs flex items-center gap-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#ee4d2d]/30">
            <div className="w-11 h-11 rounded-full bg-[#fef0ed] dark:bg-amber-950/40 text-[#ee4d2d] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ee4d2d] group-hover:text-white">
              <RotateCcw size={22} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">
                {t("trust_returns")}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                {t("trust_returns_desc")}
              </p>
            </div>
          </div>

          {/* 4 */}
          <div className="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/60 shadow-xs flex items-center gap-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#ee4d2d]/30">
            <div className="w-11 h-11 rounded-full bg-[#fef0ed] dark:bg-red-950/40 text-[#ee4d2d] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ee4d2d] group-hover:text-white">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">
                {t("trust_fast_delivery")}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                {t("trust_fast_delivery_desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. GỢI Ý HÔM NAY (DAILY RECOMMENDATIONS - CÁ NHÂN HÓA KIỂU SHOPEE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Sticky-like section title */}
        <div className="border-b-2 border-[#ee4d2d] mb-4 pb-2">
          <span className="text-[#ee4d2d] font-bold text-base sm:text-lg uppercase tracking-tight inline-block">
            {t("daily_suggestions")}
          </span>
        </div>

        {/* Multi-column Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {uniqueRecommendations.slice(0, visibleCount).map((product: any) => (
            <ProductCard
              key={product.id}
              id={product.slug || String(product.id)}
              name={product.name}
              price={Number(product.sale_price || product.price)}
              originalPrice={
                product.sale_price ? Number(product.price) : undefined
              }
              image={
                product.images?.[0]?.image_url ||
                product.thumbnail ||
                "/placeholder.jpg"
              }
              category={product.category?.name || "MeeMart"}
              rating={Number(product.rating || product.average_rating || 4.8)}
              sales={Number(product.sold_count || product.sales_count || 65)}
              badge={product.badge || undefined}
            />
          ))}
        </div>

        {/* See More Button */}
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            className="inline-flex items-center justify-center px-8 py-2.5 rounded-md border border-[#ee4d2d] text-[#ee4d2d] bg-white dark:bg-slate-800 hover:bg-[#fef0ed] dark:hover:bg-slate-700 font-semibold text-xs tracking-wide transition-all shadow-xs cursor-pointer"
          >
            {t("see_more_products")}
          </button>
        </div>
      </section>

      {/* 6. BANNER ĐẶC QUYỀN MUA SẮM WEBSITE MEEMART (PROMO & VOUCHER BANNER) */}
      <section id="promo-banner-section" className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <div className="bg-gradient-to-r from-[#ee4d2d] via-[#f05d3f] to-[#f57224] rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-[#ee4d2d]/30">
          {/* Subtle Decorative Background Highlights */}
          <div className="animate-float-slow absolute -right-16 -top-16 w-64 h-64 bg-white/15 rounded-full blur-2xl pointer-events-none" />
          <div className="animate-float-slow absolute -left-12 -bottom-12 w-48 h-48 bg-black/10 rounded-full blur-xl pointer-events-none" />

          {/* Left Column Text & Action */}
          <div className="space-y-4 max-w-xl text-center md:text-left relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-white border border-white/30">
              <Sparkles size={13} className="text-amber-200 animate-pulse" />
              {t("promo_banner_tag")}
            </span>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
              {t("promo_banner_title")}
            </h3>
            <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-normal">
              {t("promo_banner_desc")}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Link
                to="/products"
                className="animate-shimmer inline-flex items-center gap-2 bg-white text-[#ee4d2d] hover:bg-white/95 px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
              >
                <span>{t("promo_banner_btn")}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Right Column Voucher Ticket Card */}
          <div className="relative z-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-2xl p-6 shadow-2xl flex flex-col items-center sm:items-start gap-4 shrink-0 max-w-sm w-full border border-white/20 dark:border-slate-800 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between w-full border-b border-dashed border-gray-200 dark:border-slate-700 pb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#ee4d2d] bg-[#fef0ed] dark:bg-[#ee4d2d]/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Gift size={13} />
                {t("promo_card_badge")}
              </span>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-400">Website Exclusive</span>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1">
                {t("promo_card_title")}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                {t("promo_card_desc")}
              </p>
            </div>

            {/* Voucher Code Box with Copy */}
            <div className="w-full bg-gray-50 dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400">VOUCHER CODE</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#ee4d2d] tracking-wider">{t("promo_card_code")}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyVoucher}
                className="inline-flex items-center gap-1.5 bg-[#ee4d2d] hover:bg-[#d03e1e] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
              >
                {copiedVoucher ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedVoucher ? t("promo_card_saved") : t("promo_card_save")}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
