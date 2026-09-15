import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000",
    title: "Bản Sắc Thời Thượng Mùa Thu 2024",
    description: "Khám phá bộ sưu tập mới nhất mang đậm hơi thở đương đại và tối giản từ UTEShop.",
  },
  {
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2000",
    title: "Phong Cách Tối Giản Hiện Đại",
    description: "Sự kết hợp hoàn hảo giữa chất liệu cao cấp và thiết kế vượt thời gian.",
  },
  {
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2000",
    title: "Bộ Sưu Tập Giới Hạn",
    description: "Nâng tầm phong cách cá nhân với những thiết kế độc bản chỉ có tại UTEShop.",
  },
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 4000);
    return () => clearInterval(interval);
  }, [nextSlide, isHovered]);

  return (
    <section className="max-w-7xl mx-auto px-6 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div
        className="lg:col-span-2 relative aspect-[16/9] lg:aspect-auto rounded-3xl overflow-hidden group border border-gray-100 shadow-premium"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 transform ${index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"}`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10 md:p-16 text-white">
              <h1 className="text-6xl md:text-7xl font-serif font-black mb-6 max-w-3xl leading-tight drop-shadow-xl">
                {slide.title}
              </h1>
              <p className="text-xl opacity-90 mb-10 max-w-lg font-medium drop-shadow-md">
                {slide.description}
              </p>
              <div className="flex items-center gap-6">
                <Link
                  to="/products"
                  className="btn-modern px-10 text-sm uppercase tracking-[0.2em]"
                >
                  Khám phá ngay
                  <ArrowRight size={20} className="ml-3" />
                </Link>
                <div className="flex gap-3">
                  <button
                    onClick={prevSlide}
                    className="w-12 h-12 bg-white/10 hover:bg-primary border border-white/20 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="w-12 h-12 bg-white/10 hover:bg-primary border border-white/20 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="absolute bottom-10 right-10 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? "w-10 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-gradient-to-br from-[#FFE4D6] to-white border border-gray-100 rounded-[2rem] p-10 flex flex-col justify-between relative overflow-hidden group hover:shadow-premium transition-all duration-300">
          <div className="relative z-10">
            <span className="badge-modern">Giới hạn</span>
            <h3 className="text-6xl font-serif font-black mt-8 text-[#D97736] tracking-tight">
              Giảm 50%
            </h3>
            <p className="text-sm font-bold text-[#D97736]/80 mt-3 uppercase tracking-widest">
              Bộ sưu tập mùa hè
            </p>
          </div>
          <Link
            to="/products"
            className="relative z-10 w-fit p-4 bg-white border border-gray-100 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm group-hover:shadow-premium"
          >
            <ArrowRight className="w-6 h-6" />
          </Link>
          <div className="absolute -right-6 -bottom-6 text-[16rem] font-black text-[#D97736]/10 rotate-12 group-hover:rotate-0 transition-all duration-700 select-none">
            %
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#E2E8E4] to-white border border-gray-100 rounded-[2rem] p-10 flex flex-col justify-between relative overflow-hidden group hover:shadow-premium transition-all duration-300">
          <div className="relative z-10">
            <span className="badge-modern">Flash Sale</span>
            <h3 className="text-6xl font-serif font-black mt-8 text-[#4A5D50] tracking-tight">
              Giá Sốc
            </h3>
            <p className="text-sm font-bold text-[#4A5D50]/60 mt-3 uppercase tracking-widest">
              Duy nhất hôm nay
            </p>
          </div>
          <Link
            to="/products"
            className="relative z-10 w-fit p-4 bg-white border border-gray-100 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm group-hover:shadow-premium"
          >
            <ArrowRight className="w-6 h-6" />
          </Link>
          <div className="absolute -right-6 -bottom-6 text-[16rem] font-black text-[#4A5D50]/10 rotate-12 group-hover:rotate-0 transition-all duration-700 select-none">
            ⚡
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
