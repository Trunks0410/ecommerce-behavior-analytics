import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface BannerProps {
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  variant?: "primary" | "secondary" | "dark";
  className?: string;
  discount?: string;
}

const Banner = ({
  title,
  subtitle,
  description,
  image,
  ctaText,
  ctaLink = "/products",
  variant = "primary",
  className = "",
  discount,
}: BannerProps) => {
  const bgStyles = {
    primary: "bg-primary text-white",
    secondary: "bg-[#E2E8E4] text-[#4A5D50]",
    dark: "bg-black text-white",
  };

  return (
    <div className={`relative overflow-hidden rounded-[2.5rem] border-2 border-black shadow-subtle ${bgStyles[variant]} ${className}`}>
      <div className="relative z-10 p-12 md:p-16 lg:p-20 flex flex-col justify-center h-full max-w-2xl">
        {subtitle && (
          <span className="badge-brutal bg-white text-black mb-8 w-fit border-none shadow-none">
            {subtitle}
          </span>
        )}
        <h2 className="text-4xl md:text-6xl font-serif font-black leading-tight mb-8 tracking-tighter uppercase">
          {title}
        </h2>
        {description && (
          <p className="text-lg opacity-90 mb-12 max-w-md font-bold leading-relaxed">
            {description}
          </p>
        )}
        {ctaText && (
          <Link
            to={ctaLink}
            className="btn-brutal bg-white text-black text-sm uppercase tracking-widest border-none shadow-subtle hover:shadow-none"
          >
            {ctaText}
            <ArrowRight size={20} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>

      {discount && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-64 h-64 border-[15px] border-white/20 rounded-3xl rotate-12">
          <span className="text-8xl font-black">{discount}</span>
        </div>
      )}

      {image && (
        <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block">
          <img src={image} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-inherit via-inherit/50 to-transparent"></div>
        </div>
      )}
    </div>
  );
};

export default Banner;
