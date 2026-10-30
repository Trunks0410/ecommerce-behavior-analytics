import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  ChevronDown,
  User,
  Heart,
  Bell,
  HelpCircle,
  Smartphone,
  Store,
  Sun,
  Moon,
  Globe,
  Home,
  Flame,
  Ticket,
  Sparkles,
  TrendingUp,
  LayoutGrid,
  ShieldCheck,
  Truck,
  LogOut,
  Package,
  Check,
} from "lucide-react";
import { useAppSelector } from "@/app/stores/hooks";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useCategories, useProducts } from "@/hooks/useProducts";
import { NotificationDropdown } from "./NotificationDropdown";
import { useTheme } from "@/shared/context/ThemeContext";
import { useLanguage } from "@/shared/context/LanguageContext";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8088";

const Header = () => {
  const user = useAppSelector((state) => state.auth.user);
  const itemCount = useAppSelector((state) => state.cart.itemCount);
  const { isAuthenticated, handleLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { theme, toggleTheme, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const isManager =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "manager"
      : user?.role?.role_name?.toLowerCase() === "manager") ||
    user?.email?.includes("manager");

  const isAdmin =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "admin"
      : user?.role?.role_name?.toLowerCase() === "admin") ||
    user?.email?.includes("admin");

  const isVendor =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "vendor"
      : user?.role?.role_name?.toLowerCase() === "vendor") || user?.isVendor;

  const isShipper =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "shipper"
      : user?.role?.role_name?.toLowerCase() === "shipper") ||
    user?.email?.includes("shipper");

  const FACEBOOK_DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0a0a0"><rect width="24" height="24" fill="%23e4e6eb"/><circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>`;

  const [shouldShake, setShouldShake] = useState(false);
  const [forceShowDropdown, setForceShowDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  useEffect(() => {
    const handleCartAdded = () => {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      setForceShowDropdown(true);
    };

    window.addEventListener("cart-item-added", handleCartAdded);
    return () => {
      window.removeEventListener("cart-item-added", handleCartAdded);
    };
  }, []);

  useEffect(() => {
    if (forceShowDropdown) {
      const timer = setTimeout(() => {
        setForceShowDropdown(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [forceShowDropdown]);

  const getUserAvatarUrl = () => {
    const avatar = user?.avatarUrl || user?.profile?.avatar_url;
    if (!avatar) return FACEBOOK_DEFAULT_AVATAR;
    if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
    return `${API_URL}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
  };

  const { data: cartData } = useCart();
  const latestCartItems = cartData?.items
    ? [...cartData.items].reverse().slice(0, 5)
    : [];

  // Categories
  const { data: categoryList } = useCategories();
  const parentCategories = categoryList?.filter((c: any) => !c.parent_id) || [];

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults } = useProducts({
    keyword: debouncedSearch,
    limit: 6,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setShowSuggestions(false);
      navigate(`/products?keyword=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const scrollToApp = () => {
    const el = document.getElementById("app-download-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#app-download-section");
    }
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-colors shadow-xs">
      {/* 1. TOP UTILITY BAR (SHOPEE STYLE) */}
      <div className="bg-[#f8f9fa] dark:bg-slate-950/80 border-b border-gray-100 dark:border-slate-800 text-[12px] text-gray-600 dark:text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between">
          {/* Left links */}
          <div className="flex items-center space-x-4">
            <Link
              to={isVendor ? "/vendor" : "/register-shop"}
              className="hover:text-[#ee4d2d] transition-colors flex items-center gap-1 font-medium"
            >
              <Store size={13} />
              <span>{t("seller_channel")}</span>
            </Link>
            <span className="text-gray-300 dark:text-slate-700">|</span>
            <Link
              to="/products"
              className="hover:text-[#ee4d2d] transition-colors flex items-center gap-1 font-medium"
            >
              <Flame size={13} className="text-[#ee4d2d]" />
              <span>{t("nav_flash_sale")}</span>
            </Link>
            <span className="text-gray-300 dark:text-slate-700">|</span>
            <div className="hidden sm:flex items-center space-x-1.5 font-medium">
              <span>{t("connect")}</span>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#ee4d2d] transition-colors ml-1"
                title="Facebook"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#ee4d2d] transition-colors ml-1"
                title="Instagram"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right links */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1 hover:text-[#ee4d2d] transition-colors cursor-pointer py-1"
              title={isDark ? t("theme_light") : t("theme_dark")}
            >
              {isDark ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-slate-600" />}
              <span className="hidden md:inline">{isDark ? t("theme_light_short") : t("theme_dark_short")}</span>
            </button>

            {/* Notifications */}
            {isAuthenticated ? (
              <NotificationDropdown />
            ) : (
              <Link
                to="/auth/login"
                className="flex items-center gap-1 hover:text-[#ee4d2d] transition-colors"
              >
                <Bell size={13} />
                <span>{t("notifications")}</span>
              </Link>
            )}

            {/* Support */}
            <Link
              to="/blogs"
              className="flex items-center gap-1 hover:text-[#ee4d2d] transition-colors hidden sm:flex"
            >
              <HelpCircle size={13} />
              <span>{t("support")}</span>
            </Link>

            {/* Language Selector Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setShowLangDropdown(true)}
              onMouseLeave={() => setShowLangDropdown(false)}
            >
              <button
                type="button"
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1 hover:text-[#ee4d2d] transition-colors py-1 cursor-pointer font-medium"
              >
                <Globe size={13} />
                <span>{language === "vi" ? t("language_vi") : t("language_en")}</span>
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-200 ${
                    showLangDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showLangDropdown && (
                <div
                  className="absolute right-0 top-full pt-2 w-36 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Invisible Hover Bridge (Vùng cầu nối hình chữ nhật chống tắt nhầm khi rê chuột) */}
                  <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent" />
                  {/* Shopee Popover Arrow */}
                  <div className="absolute top-0.5 right-4 w-3 h-3 bg-white dark:bg-slate-800 border-t border-l border-black/[0.09] dark:border-slate-700 rotate-45 z-10" />
                  <div className="relative bg-white dark:bg-slate-800 rounded-xs sm:rounded-sm shadow-[0_2px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-black/[0.09] dark:border-slate-700 py-1.5 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage("vi");
                        setShowLangDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#fafafa] dark:hover:bg-slate-700/70 hover:text-[#ee4d2d] transition-colors flex items-center justify-between cursor-pointer ${
                        language === "vi"
                          ? "text-[#ee4d2d] font-bold bg-[#fef0ed]/60 dark:bg-slate-700/80"
                          : "text-gray-700 dark:text-slate-200"
                      }`}
                    >
                      <span>{t("language_vi")}</span>
                      {language === "vi" && <Check size={13} className="text-[#ee4d2d]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage("en");
                        setShowLangDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#fafafa] dark:hover:bg-slate-700/70 hover:text-[#ee4d2d] transition-colors flex items-center justify-between cursor-pointer ${
                        language === "en"
                          ? "text-[#ee4d2d] font-bold bg-[#fef0ed]/60 dark:bg-slate-700/80"
                          : "text-gray-700 dark:text-slate-200"
                      }`}
                    >
                      <span>{t("language_en")}</span>
                      {language === "en" && <Check size={13} className="text-[#ee4d2d]" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Auth Buttons / User Account */}
            {isAuthenticated ? (
              <div
                className="relative"
                onMouseEnter={() => setShowUserDropdown(true)}
                onMouseLeave={() => setShowUserDropdown(false)}
              >
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 hover:text-[#ee4d2d] transition-colors py-1 cursor-pointer"
                >
                  <img
                    src={getUserAvatarUrl()}
                    alt="Avatar"
                    className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                  />
                  <span className="font-semibold max-w-[100px] truncate hidden sm:inline">
                    {(user as any)?.full_name || (user as any)?.fullName || user?.username || "Tài khoản"}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${
                      showUserDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showUserDropdown && (
                  <div
                    className="absolute right-0 top-full pt-2 w-52 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Invisible Hover Bridge (Vùng cầu nối hình chữ nhật chống tắt nhầm khi rê chuột) */}
                    <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent" />
                    {/* Shopee Popover Arrow */}
                    <div className="absolute top-0.5 right-5 w-3 h-3 bg-white dark:bg-slate-800 border-t border-l border-black/[0.09] dark:border-slate-700 rotate-45 z-10" />
                    <div className="relative bg-white dark:bg-slate-800 rounded-xs sm:rounded-sm shadow-[0_2px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-black/[0.09] dark:border-slate-700 py-1.5 overflow-hidden">
                      <Link
                        to="/profile"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 dark:text-slate-200 hover:bg-[#fafafa] dark:hover:bg-slate-700/70 hover:text-[#ee4d2d] transition-colors"
                      >
                        <User size={14} />
                        <span>{t("my_account")}</span>
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 dark:text-slate-200 hover:bg-[#fafafa] dark:hover:bg-slate-700/70 hover:text-[#ee4d2d] transition-colors"
                      >
                        <Package size={14} />
                        <span>{t("purchase_orders")}</span>
                      </Link>

                      {(isAdmin || isManager) && (
                        <Link
                          to={isAdmin ? "/admin" : "/manager"}
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-amber-600 dark:text-amber-400 hover:bg-[#fafafa] dark:hover:bg-slate-700/70 transition-colors"
                        >
                          <ShieldCheck size={14} />
                          <span>Quản trị hệ thống</span>
                        </Link>
                      )}

                      {isShipper && (
                        <Link
                          to="/shipper"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-blue-600 dark:text-blue-400 hover:bg-[#fafafa] dark:hover:bg-slate-700/70 transition-colors"
                        >
                          <Truck size={14} />
                          <span>Dashboard Shipper</span>
                        </Link>
                      )}

                      {isVendor && (
                        <Link
                          to="/vendor"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-[#fafafa] dark:hover:bg-slate-700/70 transition-colors"
                        >
                          <Store size={14} />
                          <span>Kênh Người Bán</span>
                        </Link>
                      )}

                      <div className="h-px bg-gray-100 dark:bg-slate-700/80 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleLogout();
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-red-600 dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>{t("logout")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 font-medium">
                <Link
                  to="/auth/register"
                  className="hover:text-[#ee4d2d] transition-colors"
                >
                  {t("register")}
                </Link>
                <span className="text-gray-300 dark:text-slate-700">|</span>
                <Link
                  to="/auth/login"
                  className="hover:text-[#ee4d2d] transition-colors"
                >
                  {t("login")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (LOGO + WIDE SEARCH + CART) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-6 sm:gap-10">
        {/* Brand Logo - MeeMart Clean Crop */}
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2 rounded-2xl bg-white px-2.5 py-1.5 shadow-[0_0_0_1px_rgba(238,77,45,0.18),0_4px_14px_rgba(238,77,45,0.1)] transition-shadow dark:shadow-[0_0_0_2px_rgba(238,77,45,0.5),0_0_18px_rgba(238,77,45,0.28)]"
        >
          <img
            src="/logo-meemart.png"
            alt="MeeMart"
            className="h-11 sm:h-12 w-auto object-contain group-hover:scale-102 transition-transform"
          />
        </Link>

        {/* Wide Center Search Bar */}
        <div className="flex-1 max-w-2xl relative">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className="relative w-full flex items-center bg-white dark:bg-slate-800 rounded-full border-2 border-[#ee4d2d] p-1 shadow-xs focus-within:shadow-md transition-shadow">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={t("search_placeholder")}
                className="w-full pl-4 pr-3 py-1.5 bg-transparent border-0 outline-none text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
              />
              <button
                type="submit"
                className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white px-5 sm:px-6 py-2 rounded-full font-medium flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions &&
            searchTerm.trim() &&
            searchResults?.products &&
            searchResults.products.length > 0 && (
              <div
                onMouseLeave={() => setShowSuggestions(false)}
                className="absolute top-full left-0 w-full mt-1.5 bg-white dark:bg-slate-800 border border-black/[0.09] dark:border-slate-700 rounded-xs sm:rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                  Gợi ý sản phẩm
                </div>
                {searchResults.products.map((product: any) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug || product.id}`}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center gap-3 p-2 hover:bg-[#fafafa] dark:hover:bg-slate-700/60 rounded-xs transition-colors border-b border-gray-50 dark:border-slate-700/40 last:border-0"
                  >
                    <img
                      src={product.images?.[0]?.image_url || "/placeholder.jpg"}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded-xs border border-gray-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-slate-200 hover:text-[#ee4d2d] transition-colors truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-[#ee4d2d] font-bold mt-0.5">
                        {product.sale_price
                          ? Number(product.sale_price).toLocaleString()
                          : Number(product.price).toLocaleString()}
                        ₫
                      </p>
                    </div>
                  </Link>
                ))}
                <Link
                  to={`/products?keyword=${encodeURIComponent(searchTerm.trim())}`}
                  onClick={() => setShowSuggestions(false)}
                  className="block w-full text-center py-2 text-xs font-semibold text-[#ee4d2d] hover:bg-[#fef0ed] dark:hover:bg-slate-700 rounded-xs mt-1 transition-colors"
                >
                  {t("view_all")} ({searchResults.total || searchResults.products.length})
                </Link>
              </div>
            )}
        </div>

        {/* Right Icon Actions: Wishlist & Cart & Account */}
        <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
          {/* Wishlist */}
          <Link
            to="/profile?tab=favorites"
            className="hidden md:flex p-2 text-gray-600 dark:text-slate-300 hover:text-[#ee4d2d] hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
            title={t("favorites")}
          >
            <Heart size={22} />
          </Link>

          {/* Cart Icon & Dropdown */}
          <div className="relative group/cart py-1">
            <Link
              to="/cart"
              className={`relative p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-[#fef0ed] dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 hover:text-[#ee4d2d] rounded-full flex items-center justify-center transition-all ${
                shouldShake ? "animate-shake" : ""
              }`}
            >
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#ee4d2d] text-white text-[11px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-xs">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>

            {/* Cart Hover Popover */}
            <div
              className={`${
                forceShowDropdown ? "block" : "hidden group-hover/cart:block"
              } absolute right-0 top-full pt-2 w-[380px] z-50 animate-in fade-in zoom-in-95 duration-150`}
            >
              {/* Invisible Hover Bridge (Vùng cầu nối hình chữ nhật chống tắt nhầm khi rê chuột) */}
              <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent" />
              {/* Shopee Popover Arrow */}
              <div className="absolute top-0.5 right-4 w-3 h-3 bg-white dark:bg-slate-800 border-t border-l border-black/[0.09] dark:border-slate-700 rotate-45 z-10" />

              <div className="relative bg-white dark:bg-slate-800 border border-black/[0.09] dark:border-slate-700 rounded-xs sm:rounded-sm shadow-[0_2px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-3.5 overflow-hidden">
                {latestCartItems.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                      Sản phẩm mới thêm
                    </p>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {latestCartItems.map((item: any) => {
                        const imgUrl =
                          item.variant?.product?.images?.[0]?.image_url ||
                          item.product?.images?.[0]?.image_url ||
                          item.variant?.image_url;
                        const displayName =
                          item.variant?.product?.name ||
                          item.product?.name ||
                          "Sản phẩm";
                        const variantName = [
                          item.variant?.color,
                          item.variant?.size,
                        ]
                          .filter(Boolean)
                          .join(" / ");
                        const price = Number(
                          item.variant?.sale_price ||
                            item.variant?.price ||
                            item.unit_price ||
                            item.product?.sale_price ||
                            item.product?.price ||
                            0,
                        );
                        const productSlug =
                          item.variant?.product?.slug || item.product?.slug;

                        return (
                          <Link
                            key={item.id}
                            to={productSlug ? `/products/${productSlug}` : "#"}
                            className="flex gap-2.5 items-center border-b border-gray-50 dark:border-slate-700/50 pb-2.5 last:border-0 hover:bg-[#fafafa] dark:hover:bg-slate-700/50 p-1.5 rounded-xs transition-colors"
                          >
                            <img
                              src={
                                imgUrl
                                  ? imgUrl.startsWith("http")
                                    ? imgUrl
                                    : `${API_URL}${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`
                                  : "/placeholder.jpg"
                              }
                              alt={displayName}
                              className="w-11 h-11 object-cover rounded-xs border border-gray-100 dark:border-slate-700 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate hover:text-[#ee4d2d]">
                                {displayName}
                              </h4>
                              {variantName && (
                                <p className="text-[10px] text-gray-400 dark:text-slate-400">
                                  {variantName}
                                </p>
                              )}
                              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                {t("quantity")}: {item.quantity}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-[#ee4d2d]">
                                {(price * item.quantity).toLocaleString()}₫
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {cartData?.items?.length || 0} sản phẩm trong giỏ
                      </span>
                      <Link
                        to="/cart"
                        className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-semibold py-2 px-4 rounded-xs transition-colors shadow-xs"
                      >
                        {t("cart")}
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <ShoppingBag size={28} className="text-gray-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Chưa có sản phẩm trong giỏ hàng
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Account Link */}
          <Link
            to={isAuthenticated ? "/profile" : "/auth/login"}
            className="hidden sm:flex items-center gap-1.5 text-gray-700 dark:text-slate-200 hover:text-[#ee4d2d] font-medium text-xs p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <User size={19} />
            <span>{t("my_account")}</span>
          </Link>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION BAR (CATEGORIES, FLASH SALE, VOUCHERS) */}
      <div className="border-t border-gray-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between text-xs font-medium text-gray-700 dark:text-slate-300">
          <div className="flex items-center space-x-6">
            {/* Home */}
            <Link
              to="/"
              className={`flex items-center gap-1.5 transition-colors py-2 border-b-2 ${
                location.pathname === "/"
                  ? "text-[#ee4d2d] border-[#ee4d2d] font-bold"
                  : "border-transparent hover:text-[#ee4d2d]"
              }`}
            >
              <Home size={14} />
              <span>{t("nav_home")}</span>
            </Link>

            {/* Categories Dropdown */}
            <div className="relative group py-2">
              <Link
                to="/products"
                className="flex items-center gap-1.5 hover:text-[#ee4d2d] transition-colors"
              >
                <LayoutGrid size={14} />
                <span>{t("nav_categories")}</span>
                <ChevronDown size={12} />
              </Link>
              {/* Mega menu */}
              <div className="absolute top-full left-0 w-[600px] bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl rounded-b-xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="grid grid-cols-3 gap-4">
                  {parentCategories.slice(0, 9).map((parent: any) => (
                    <div key={parent.id} className="space-y-1">
                      <Link
                        to={`/products?category=${parent.slug}`}
                        className="font-bold text-xs text-gray-900 dark:text-slate-100 hover:text-[#ee4d2d] transition-colors block"
                      >
                        {parent.name}
                      </Link>
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 space-y-0.5">
                        {categoryList
                          ?.filter((c: any) => c.parent_id === parent.id)
                          .slice(0, 3)
                          .map((sub: any) => (
                            <Link
                              key={sub.id}
                              to={`/products?category=${sub.slug}`}
                              className="block hover:text-[#ee4d2d] transition-colors truncate"
                            >
                              {sub.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Flash Sale */}
            <Link
              to="/products?flash_sale=true"
              className="flex items-center gap-1.5 hover:text-[#ee4d2d] transition-colors py-2"
            >
              <Flame size={14} className="text-[#ee4d2d]" />
              <span>{t("nav_flash_sale")}</span>
            </Link>

            {/* Vouchers */}
            <Link
              to="/vouchers"
              className="flex items-center gap-1.5 hover:text-[#ee4d2d] transition-colors py-2"
            >
              <Ticket size={14} className="text-amber-500" />
              <span>{t("nav_coupons")}</span>
            </Link>

            {/* New Arrivals */}
            <Link
              to="/products?sort=newest"
              className="flex items-center gap-1.5 hover:text-[#ee4d2d] transition-colors py-2"
            >
              <Sparkles size={14} className="text-blue-500" />
              <span>{t("nav_new_arrivals")}</span>
            </Link>

            {/* Best Sellers */}
            <Link
              to="/products?sort=bestseller"
              className="flex items-center gap-1.5 hover:text-[#ee4d2d] transition-colors py-2"
            >
              <TrendingUp size={14} className="text-emerald-500" />
              <span>{t("nav_best_sellers")}</span>
            </Link>
          </div>

          {/* Right side: Top Shops */}
          <Link
            to="/shops"
            className="flex items-center gap-1 text-gray-500 dark:text-slate-400 hover:text-[#ee4d2d] transition-colors"
          >
            <Store size={13} />
            <span>{t("nav_shops")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
