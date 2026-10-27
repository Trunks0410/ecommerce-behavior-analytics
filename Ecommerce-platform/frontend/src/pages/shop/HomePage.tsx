import ProductCard from "@/shared/components/ui/ProductCard";
import HeroSection from "@/shared/components/home/HeroSection";
import {
  ArrowRight,
  Truck,
  RefreshCw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Star,
  Sparkles,
  Eye,
  Store,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useValidCoupons, useSaveCoupon } from "@/hooks/useCoupons";
import { useAppSelector } from "@/app/stores/hooks";
import {
  useFeaturedProducts,
  useNewestProducts,
  useBestSellerProducts,
  useMostViewedProducts,
} from "@/hooks/useProducts";
import { useTopShops } from "@/hooks/useShops";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import DEFAULT_SHOP_LOGO from "@/assets/default-shop-logo.svg";

const HomePage = () => {
  const { data: validCoupons } = useValidCoupons();
  const { mutate: saveCoupon } = useSaveCoupon();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);
  const navigate = useNavigate();

  const { data: topShopsRes, isLoading: loadTopShops } = useTopShops();
  const topShops = topShopsRes?.data || [];
  const { data: newestProducts = [], isLoading: loadNewest } = useNewestProducts();
  const { data: featuredProducts = [], isLoading: loadFeatured } = useFeaturedProducts();
  const { data: mostViewed = [], isLoading: loadMostViewed } = useMostViewedProducts();
  const { data: bestSellers = [], isLoading: loadBestSellers } = useBestSellerProducts();

  const platformCoupons = validCoupons?.filter((c: any) => !c.shop_id) || [];

  const handleSaveCoupon = (
    e: React.MouseEvent,
    couponId: number,
    isSaved: boolean,
  ) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để lưu mã");
      navigate("/auth/login?redirect=/");
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

  return (
    <div className="space-y-32 pb-32 relative">
      {/* Background Gradient SaaS Style */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-white to-transparent -z-10 pointer-events-none"></div>

      {/* Hero Section */}
      <HeroSection />

      {/* ================= BỔ SUNG 0: GIAN HÀNG NỔI BẬT (TOP SHOPS) ================= */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5 mb-2">
              <Store size={14} /> Mua sắm chính hãng
            </span>
            <h2 className="text-5xl font-serif font-black tracking-tighter uppercase">
              Gian Hàng Nổi Bật
            </h2>
            <div className="h-1 w-16 bg-primary rounded-full mt-4"></div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/shops"
              className="btn-modern-secondary text-xs uppercase tracking-widest inline-flex items-center"
            >
              Xem tất cả
            </Link>
          </div>
        </div>

        {loadTopShops ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="aspect-square bg-gray-100 border border-gray-100 rounded-full"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {topShops.map((shop: any) => (
              <Link
                key={shop.id}
                to={`/shop/${shop.id}`}
                className="group flex flex-col items-center gap-4 animate-in fade-in duration-300"
              >
                <div className="w-32 h-32 rounded-full border border-gray-100 overflow-hidden shadow-soft group-hover:shadow-premium group-hover:scale-105 transition-all duration-300 relative bg-white">
                  <img
                    src={shop.shop_logo || DEFAULT_SHOP_LOGO}
                    alt={shop.shop_name}
                    className="w-full h-full object-cover"
                  />
                  {shop.rating >= 4.5 && (
                    <div className="absolute bottom-0 inset-x-0 bg-primary/95 text-white text-[9px] font-bold uppercase text-center py-1">
                      Uy tín
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h4 className="font-black text-sm uppercase tracking-tight group-hover:text-primary transition-colors">
                    {shop.shop_name}
                  </h4>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-primary text-primary" />
                    <span className="text-xs font-bold">
                      {shop.rating || 5.0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-5xl font-serif font-black mb-4 tracking-tighter uppercase">
              Hàng Mới Về
            </h2>
            <div className="h-1 w-16 bg-primary rounded-full"></div>
          </div>
          <Link
            to="/products"
            className="btn-modern-secondary text-xs uppercase tracking-widest"
          >
            Xem tất cả
          </Link>
        </div>

        {loadNewest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="aspect-[3/4] bg-gray-100 border border-gray-100 rounded-2xl"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {newestProducts?.map((product) => (
              <ProductCard
                key={product.id}
                id={product.slug}
                name={product.name}
                price={product.sale_price || product.price}
                originalPrice={product.sale_price ? product.price : undefined}
                image={product.images?.[0]?.image_url || "/placeholder.jpg"}
                category={product.category?.name || "Danh mục"}
                rating={Number(product.rating_average) || 0}
                sales={product.sold_count}
                badge={product.is_new ? "Mới" : undefined}
                shop={product.shop}
              />
            ))}
          </div>
        )}
      </section>

      {/* CTA Community Banner */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-gradient-to-r from-secondary to-accent text-white rounded-[2.5rem] p-16 md:p-24 relative overflow-hidden group shadow-premium">
          <div className="relative z-10 max-w-2xl">
            <span className="text-primary font-black uppercase tracking-[0.3em] mb-6 block">
              CỘNG ĐỒNG UTESHOP
            </span>
            <h2 className="text-5xl md:text-7xl font-serif font-black mb-10 leading-tight">
              Đăng ký ngay & nhận ưu đãi -20%
            </h2>
            <p className="text-lg opacity-80 mb-12 font-medium leading-relaxed">
              Trở thành hội viên để nhận những đặc quyền sớm nhất về các bộ sưu
              tập giới hạn và sự kiện độc quyền.
            </p>
            <Link
              to="/auth/register"
              className="btn-modern text-sm uppercase tracking-[0.2em]"
            >
              Tham gia ngay
            </Link>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none overflow-hidden">
            <div className="text-[40rem] font-black absolute -right-20 top-1/2 -translate-y-1/2 rotate-12 select-none">
              UTE
            </div>
          </div>
        </div>
      </section>

      {/* ================= BỔ SUNG 1: SẢN PHẨM NỔI BẬT (FEATURED - SWIPER) ================= */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5 mb-2">
              <Sparkles size={14} /> Bộ sưu tập đặc biệt
            </span>
            <h2 className="text-5xl font-serif font-black tracking-tighter uppercase">
              Sản Phẩm Nổi Bật
            </h2>
            <div className="h-1 w-16 bg-primary rounded-full mt-4"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                className="featured-prev w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white/80 backdrop-blur-md shadow-soft hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 active:scale-90 hover:shadow-premium cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="featured-next w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white/80 backdrop-blur-md shadow-soft hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 active:scale-90 hover:shadow-premium cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Link
              to="/products?isFeatured=true"
              className="btn-modern-secondary text-xs uppercase tracking-widest inline-flex items-center"
            >
              Xem tất cả
            </Link>
          </div>
        </div>

        {loadFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="aspect-[3/4] bg-gray-100 border border-gray-100 rounded-2xl"
              ></div>
            ))}
          </div>
        ) : (
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            navigation={{
              prevEl: ".featured-prev",
              nextEl: ".featured-next",
            }}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            pagination={{ clickable: true }}
            breakpoints={{
              640: { slidesPerView: 2 },
              768: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
            }}
            className="pb-16 px-2 home-swiper"
          >
            {featuredProducts?.map((product) => (
              <SwiperSlide key={product.id}>
                <div className="pb-4">
                  <ProductCard
                    id={product.slug}
                    name={product.name}
                    price={product.sale_price || product.price}
                    originalPrice={
                      product.sale_price ? product.price : undefined
                    }
                    image={product.images?.[0]?.image_url || "/placeholder.jpg"}
                    category={product.category?.name || "Danh mục"}
                    rating={Number(product.rating_average) || 0}
                    sales={product.sold_count}
                    badge={product.is_featured ? "Sale" : undefined}
                    shop={product.shop}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </section>

      {/* ================= BỔ SUNG 2: SẢN PHẨM ĐƯỢC QUAN TÂM NHẤT (MOST VIEWED - SWIPER) ================= */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5 mb-2">
              <Eye size={14} /> Xu hướng tìm kiếm
            </span>
            <h2 className="text-5xl font-serif font-black tracking-tighter uppercase">
              Được Quan Tâm Nhất
            </h2>
            <div className="h-1 w-16 bg-primary rounded-full mt-4"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                className="most-viewed-prev w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white/80 backdrop-blur-md shadow-soft hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 active:scale-90 hover:shadow-premium cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="most-viewed-next w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white/80 backdrop-blur-md shadow-soft hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 active:scale-90 hover:shadow-premium cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Link
              to="/products?sort=most_viewed"
              className="btn-modern-secondary text-xs uppercase tracking-widest inline-flex items-center"
            >
              Xem tất cả
            </Link>
          </div>
        </div>

        {loadMostViewed ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="aspect-[3/4] bg-gray-100 border border-gray-100 rounded-2xl"
              ></div>
            ))}
          </div>
        ) : (
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            navigation={{
              prevEl: ".most-viewed-prev",
              nextEl: ".most-viewed-next",
            }}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            pagination={{ clickable: true }}
            breakpoints={{
              640: { slidesPerView: 2 },
              768: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
            }}
            className="pb-16 px-2 home-swiper"
          >
            {mostViewed?.map((product) => (
              <SwiperSlide key={product.id}>
                <div className="pb-4">
                  <ProductCard
                    id={product.slug}
                    name={product.name}
                    price={product.sale_price || product.price}
                    originalPrice={
                      product.sale_price ? product.price : undefined
                    }
                    image={product.images?.[0]?.image_url || "/placeholder.jpg"}
                    category={product.category?.name || "Danh mục"}
                    rating={Number(product.rating_average) || 0}
                    sales={product.sold_count}
                    badge={product.view_count > 100 ? "Hot" : undefined}
                    shop={product.shop}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </section>

      {/* Best Sellers & Voucher Section */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-9">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-5xl font-serif font-black mb-4 tracking-tighter uppercase">
                Bán Chạy Nhất
              </h2>
              <div className="h-1 w-16 bg-primary rounded-full"></div>
            </div>
            <div className="flex gap-2">
              <button className="best-seller-prev w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white/80 backdrop-blur-md shadow-soft hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 active:scale-90 hover:shadow-premium cursor-pointer">
                <ChevronLeft size={18} />
              </button>
              <button className="best-seller-next w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white/80 backdrop-blur-md shadow-soft hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 active:scale-90 hover:shadow-premium cursor-pointer">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {loadBestSellers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="aspect-[3/4] bg-gray-100 border border-gray-100 rounded-2xl"
                ></div>
              ))}
            </div>
          ) : (
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              navigation={{
                prevEl: ".best-seller-prev",
                nextEl: ".best-seller-next",
              }}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              pagination={{ clickable: true }}
              breakpoints={{
                640: { slidesPerView: 2 },
                768: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              className="pb-16 px-2 home-swiper"
            >
              {bestSellers?.map((product) => (
                <SwiperSlide key={product.id}>
                  <div className="pb-4">
                    <ProductCard
                      id={product.slug}
                      name={product.name}
                      price={product.sale_price || product.price}
                      originalPrice={
                        product.sale_price ? product.price : undefined
                      }
                      image={
                        product.images?.[0]?.image_url || "/placeholder.jpg"
                      }
                      category={product.category?.name || "Danh mục"}
                      rating={Number(product.rating_average) || 0}
                      sales={product.sold_count}
                      badge={product.sold_count > 15 ? "Hot" : undefined}
                      shop={product.shop}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>

        {/* Voucher Sidebar */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-soft hover:shadow-premium transition-all duration-300 flex flex-col h-full min-w-0">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
              <Ticket className="text-primary" /> Ưu đãi độc quyền
            </h3>
            <div className="space-y-6 flex-1">
              {platformCoupons.length > 0 ? (
                platformCoupons.slice(0, 3).map((v: any, i: number) => {
                  const colors = [
                    "bg-orange-50 text-orange-600 border-orange-200",
                    "bg-green-50 text-green-600 border-green-200",
                    "bg-blue-50 text-blue-600 border-blue-200",
                    "bg-purple-50 text-purple-600 border-purple-200",
                    "bg-pink-50 text-pink-600 border-pink-200",
                  ];
                  const color = colors[i % colors.length];
                  return (
                    <div
                      key={v.id}
                      className={`p-6 rounded-2xl border border-dashed ${color} transition-all hover:scale-[1.02] cursor-pointer`}
                      onClick={() => {
                        navigator.clipboard.writeText(v.code);
                        toast.success(`Đã sao chép mã ${v.code}`);
                      }}
                      title="Nhấn để copy mã"
                    >
                      <div className="font-black text-xl mb-1 tracking-wider flex items-center justify-between gap-2">
                        <span className="truncate" title={v.code}>
                          {v.code}
                        </span>
                      </div>
                      <div className="text-[11px] font-black opacity-80 leading-tight">
                        Giảm{" "}
                        {v.discount_type === "PERCENT"
                          ? `${v.discount_value}%`
                          : `${Number(v.discount_value).toLocaleString()}₫`}
                        {v.max_discount
                          ? ` (Tối đa ${Number(v.max_discount).toLocaleString()}₫)`
                          : ""}
                      </div>
                      <div className="text-[10px] mt-1 font-bold opacity-60">
                        Đơn tối thiểu{" "}
                        {Number(v.min_order_amount).toLocaleString()}₫
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleSaveCoupon(e, v.id, v.isSaved)}
                        disabled={v.isSaved}
                        className={`mt-4 w-full shrink-0 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${
                          v.isSaved
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-black text-white hover:bg-primary"
                        }`}
                      >
                        {v.isSaved ? "Đã lưu" : "Lưu mã"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm font-bold text-gray-500 text-center py-10">
                  Hiện tại chưa có ưu đãi nào
                </div>
              )}
            </div>
            <button
              className="btn-modern w-full mt-10 py-3 px-2 leading-tight flex flex-col items-center justify-center"
              onClick={() => navigate("/vouchers")}
            >
              <span className="text-[10px] uppercase tracking-widest opacity-80 mb-1">
                Xem tất cả
              </span>
              <span className="text-base font-black uppercase tracking-tighter">
                Voucher
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* "Còn rất nhiều thiết kế khác" */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-primary/5 border border-dashed border-primary/30 p-16 rounded-[2.5rem] text-center space-y-8">
          <h3 className="text-4xl font-serif font-black uppercase tracking-tighter italic">
            "Còn rất nhiều thiết kế khác đang chờ bạn khám phá"
          </h3>
          <p className="text-gray-500 font-bold max-w-xl mx-auto text-lg">
            Đừng bỏ lỡ cơ hội sở hữu những món đồ thời trang độc bản và phong
            cách nhất mùa này.
          </p>
          <Link
            to="/products"
            className="btn-modern text-sm uppercase tracking-widest"
          >
            Đến cửa hàng ngay
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
        {[
          {
            icon: <Truck size={36} />,
            title: "Giao hàng",
            desc: "Nhanh chóng & An toàn",
          },
          {
            icon: <RefreshCw size={36} />,
            title: "Đổi trả",
            desc: "Linh hoạt trong 30 ngày",
          },
          {
            icon: <ShieldCheck size={36} />,
            title: "Chất lượng",
            desc: "Cam kết chính hãng 100%",
          },
        ].map((f, i) => (
          <div
            key={i}
            className="bg-white/90 backdrop-blur-md border border-gray-100 p-10 rounded-3xl flex flex-col items-center text-center space-y-6 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary hover:scale-110 transition-transform duration-300">
              {f.icon}
            </div>
            <h4 className="text-2xl font-serif font-black uppercase tracking-tight">
              {f.title}
            </h4>
            <p className="text-sm font-bold text-gray-400">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default HomePage;
