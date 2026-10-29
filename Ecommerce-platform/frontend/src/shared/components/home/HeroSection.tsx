import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight, Tag, Sparkles } from "lucide-react";
import { useLanguage } from "@/shared/context/LanguageContext";

const heroBanners = [
  {
    tagKey: "hero_slide1_tag",
    titleKey: "hero_slide1_title",
    subtitleKey: "hero_slide1_subtitle",
    saleBadgeKey: "hero_slide1_badge",
    buttonTextKey: "hero_slide1_btn",
    link: "/products",
    bgGradient: "from-red-600 via-rose-500 to-amber-500",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200",
  },
  {
    tagKey: "hero_slide2_tag",
    titleKey: "hero_slide2_title",
    subtitleKey: "hero_slide2_subtitle",
    saleBadgeKey: "hero_slide2_badge",
    buttonTextKey: "hero_slide2_btn",
    link: "/products?category=dien-tu",
    bgGradient: "from-blue-600 via-indigo-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=1200",
  },
  {
    tagKey: "hero_slide3_tag",
    titleKey: "hero_slide3_title",
    subtitleKey: "hero_slide3_subtitle",
    saleBadgeKey: "hero_slide3_badge",
    buttonTextKey: "hero_slide3_btn",
    link: "/products?category=thoi-trang",
    bgGradient: "from-amber-600 via-orange-500 to-rose-500",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200",
  },
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useLanguage();

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroBanners.length) % heroBanners.length);
  };

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(nextSlide, 4500);
    return () => clearInterval(interval);
  }, [nextSlide, isHovered]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Left Column: 2/3 Main Banner Slider */}
        <div
          className="lg:col-span-2 relative aspect-[16/9] lg:aspect-[2.1/1] rounded-xl overflow-hidden group shadow-xs bg-slate-900"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {heroBanners.map((banner, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Background Image with Dark Gradient Overlay */}
              <img
                src={banner.image}
                alt={t(banner.titleKey as any)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent flex flex-col justify-center p-6 sm:p-10 text-white">
                {/* Promo Badge */}
                <span className="inline-block w-fit bg-[#ee4d2d] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 shadow-xs">
                  {t(banner.tagKey as any)}
                </span>

                {/* Main Headline */}
                <h1 className="text-2xl sm:text-4xl font-extrabold mb-2 max-w-md leading-tight text-white drop-shadow-sm">
                  {t(banner.titleKey as any)}
                </h1>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm text-gray-200 mb-6 max-w-sm line-clamp-2 drop-shadow-xs">
                  {t(banner.subtitleKey as any)}
                </p>

                {/* Big Sale & CTA */}
                <div className="flex items-center gap-4">
                  <Link
                    to={banner.link}
                    className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white px-6 py-2.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <span>{t(banner.buttonTextKey as any)}</span>
                    <ArrowRight size={14} />
                  </Link>

                  <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/30 text-white font-black text-sm tracking-wider">
                    {t(banner.saleBadgeKey as any)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Nav Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>

          {/* Pagination Dots */}
          <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
            {heroBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentSlide ? "w-6 bg-[#ee4d2d]" : "w-2 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Column: 1/3 Two Stacked Promo Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3.5">
          {/* Card 1: Mã Giảm Giá */}
          <Link
            to="/vouchers"
            className="relative rounded-xl overflow-hidden group shadow-xs border border-gray-100 dark:border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 aspect-[2.2/1] flex flex-col justify-center p-5 text-white transition-transform hover:scale-[1.01]"
          >
            <img
              src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600"
              alt="Mã giảm giá"
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="relative z-10">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1">
                <Tag size={12} className="text-[#ee4d2d]" /> {t("hero_card1_tag")}
              </span>
              <h3 className="text-xl sm:text-2xl font-black mt-1 text-white">
                {t("hero_card1_title")}
              </h3>
              <p className="text-[11px] text-gray-300 mt-0.5">{t("hero_card1_desc")}</p>
            </div>
          </Link>

          {/* Card 2: Hàng Hiệu */}
          <Link
            to="/products?category=thoi-trang"
            className="relative rounded-xl overflow-hidden group shadow-xs border border-gray-100 dark:border-slate-800 bg-gradient-to-r from-emerald-950 to-slate-900 aspect-[2.2/1] flex flex-col justify-center p-5 text-white transition-transform hover:scale-[1.01]"
          >
            <img
              src="https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=600"
              alt="Hàng hiệu"
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="relative z-10">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" /> {t("hero_card2_tag")}
              </span>
              <h3 className="text-xl sm:text-2xl font-black mt-1 text-white">
                {t("hero_card2_title")}
              </h3>
              <p className="text-[11px] text-gray-300 mt-0.5">{t("hero_card2_desc")}</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
