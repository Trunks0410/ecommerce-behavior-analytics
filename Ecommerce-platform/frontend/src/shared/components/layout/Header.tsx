import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Search,
  ChevronDown,
  User,
  ShieldCheck,
} from "lucide-react";
import { useAppSelector } from "@/app/stores/hooks";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useCategories, useProducts } from "@/hooks/useProducts";
import { NotificationDropdown } from "./NotificationDropdown";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8088";

const Header = () => {
  const user = useAppSelector((state) => state.auth.user);
  const itemCount = useAppSelector((state) => state.cart.itemCount);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
    typeof user?.role === "string"
      ? user.role.toLowerCase() === "vendor"
      : user?.role?.role_name?.toLowerCase() === "vendor";

  const isShipper =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "shipper"
      : user?.role?.role_name?.toLowerCase() === "shipper") ||
    user?.email?.includes("shipper");

  const FACEBOOK_DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0a0a0"><rect width="24" height="24" fill="%23e4e6eb"/><circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>`;

  const [shouldShake, setShouldShake] = useState(false);
  const [forceShowDropdown, setForceShowDropdown] = useState(false);

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
    if (!avatar) {
      return FACEBOOK_DEFAULT_AVATAR;
    }
    if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
    return `${API_URL}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
  };

  // Gọi useCart để fetch data (enabled: isAuthenticated được set trong hook nếu cần)
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
  const [searchType, setSearchType] = useState<"PRODUCT" | "SHOP">("PRODUCT");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults } = useProducts({
    keyword: debouncedSearch,
    limit: 5,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setShowSuggestions(false);
      if (searchType === "PRODUCT") {
        navigate(`/products?keyword=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        navigate(`/shops?search=${encodeURIComponent(searchTerm.trim())}`);
      }
    }
  };

  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-black/10 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-10">
        {/* Logo - Sửa lại màu Cam cho cả Icon và Chữ */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark text-white rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-premium group-hover:scale-105 transition-all">
            <ShoppingBag size={24} strokeWidth={2.5} />
          </div>
          <span className="font-serif text-2xl font-black tracking-tighter text-primary uppercase group-hover:text-black transition-colors">
            UTEShop
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">


          <div className="relative group py-8">
            <button className="flex items-center gap-1 text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">
              DANH MỤC <ChevronDown size={14} />
            </button>
            <div className="mega-menu left-[-250px] w-[900px]">
              <div className="grid grid-cols-4 gap-12 p-10 max-w-6xl mx-auto">
                {parentCategories.map((parent: any) => {
                  const subCats =
                    categoryList?.filter(
                      (c: any) => c.parent_id === parent.id,
                    ) || [];
                  return (
                    <div key={parent.id}>
                      <h4 className="font-black text-black mb-6 pb-2 border-b border-black/10 uppercase text-[10px] tracking-widest hover:text-primary transition-colors">
                        <Link to={`/products?page=1&category=${parent.slug}`}>
                          {parent.name}
                        </Link>
                      </h4>
                      <ul className="space-y-4">
                        {subCats.map((sub: any) => (
                          <li key={sub.id}>
                            <Link
                              to={`/products?page=1&category=${sub.slug}`}
                              className="text-sm font-bold text-gray-500 hover:text-primary transition-colors flex items-center gap-2"
                            >
                              <div className="w-1 h-1 bg-gray-300 rounded-full group-hover:bg-primary transition-all"></div>
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Link
            to="/products"
            className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors"
          >
            BỘ SƯU TẬP
          </Link>
          <Link
            to="/blogs"
            className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors"
          >
            BLOG TIN TỨC
          </Link>
          <Link
            to="/vouchers"
            className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors text-primary"
          >
            SĂN VOUCHER
          </Link>
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl relative hidden md:block group/search">
          <form onSubmit={handleSearchSubmit} className="flex relative">
            <div className="relative z-10 flex-shrink-0">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as "PRODUCT" | "SHOP")}
                className="h-11 pl-4 pr-8 bg-gray-100 border-r border-gray-200 text-xs font-black uppercase tracking-wider rounded-l-full appearance-none cursor-pointer focus:outline-none hover:bg-gray-200 transition-colors"
              >
                <option value="PRODUCT">Sản phẩm</option>
                <option value="SHOP">Shop</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </div>
            <input
              type="text"
              placeholder={searchType === "PRODUCT" ? "Tìm kiếm sản phẩm..." : "Tìm kiếm shop..."}
              className="input-modern w-full h-11 pl-12 rounded-r-full rounded-l-none bg-gray-50/50"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <Search
              className="absolute left-[130px] top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-primary transition-colors cursor-pointer"
              size={18}
              strokeWidth={2.5}
              onClick={handleSearchSubmit}
            />
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions &&
            searchTerm.trim() &&
            searchResults?.products &&
            searchResults.products.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-premium p-2 z-50">
                {searchResults.products.map((product: any) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0"
                  >
                    <img
                      src={product.images?.[0]?.image_url || "/placeholder.jpg"}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded-md border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-primary font-bold">
                        {product.sale_price
                          ? product.sale_price.toLocaleString()
                          : product.price.toLocaleString()}
                        ₫
                      </p>
                    </div>
                  </Link>
                ))}
                <Link
                  to={`/products?keyword=${encodeURIComponent(searchTerm.trim())}`}
                  className="block w-full text-center py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg mt-2"
                >
                  Xem tất cả kết quả
                </Link>
              </div>
            )}
        </div>

        {/* Right Icons */}
        <div className="flex items-center space-x-4 shrink-0">
          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="relative group/cart py-2">
            <Link
              to="/cart"
              className={`relative w-11 h-11 bg-white border border-gray-100 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-soft hover:-translate-y-1 active:scale-95 text-gray-700 ${shouldShake ? "animate-shake" : ""}`}
            >
              <ShoppingCart size={22} strokeWidth={2.5} />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] px-1 h-5 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-lg shadow-sm border border-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>

            {/* Cart Dropdown on Hover */}
            <div
              className={`${forceShowDropdown ? "block" : "hidden group-hover/cart:block"} absolute right-0 top-full mt-0 pt-3 w-[380px] z-50 animate-in fade-in slide-in-from-top-2 text-left`}
            >
              <div className="bg-white border border-gray-100 rounded-2xl shadow-premium p-5">
                {latestCartItems.length > 0 ? (
                  <>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                      Sản phẩm mới thêm
                    </p>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
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
                            className="flex gap-3 items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0 hover:bg-gray-50/50 p-1 rounded-lg transition-colors"
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
                              className="w-12 h-12 object-cover rounded-lg border border-black/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="text-xs font-black text-black truncate">
                                {displayName}
                              </h4>
                              {variantName && (
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                  {variantName}
                                </p>
                              )}
                              <p className="text-[9px] text-gray-500 font-bold mt-0.5">
                                Số lượng: {item.quantity}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-primary">
                                {(price * item.quantity).toLocaleString()}₫
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-gray-400">
                        Còn lại: thêm được{" "}
                        {99 - (cartData?.items?.length || 0) > 0
                          ? 99 - (cartData?.items?.length || 0)
                          : 0}{" "}
                        sản phẩm
                      </span>
                      <Link
                        to="/cart"
                        className="btn-modern py-2.5 px-5 text-[9px]"
                      >
                        Xem Giỏ Hàng
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-2 border border-black/5">
                      <ShoppingBag size={20} />
                    </div>
                    <p className="text-xs font-bold text-gray-500">
                      Chưa có sản phẩm trong giỏ
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isAuthenticated && <NotificationDropdown />}

          {isAuthenticated && (isManager || isAdmin) && (
            <Link
              to={isAdmin ? "/admin" : "/manager"}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-black rounded-full font-black text-[10px] uppercase tracking-widest bg-black text-white hover:bg-primary transition-all shadow-soft active:scale-95 shrink-0"
            >
              <ShieldCheck size={16} strokeWidth={2.5} />
              Quản trị viên
            </Link>
          )}

          {isAuthenticated && isShipper && (
            <Link
              to="/shipper"
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-black rounded-full font-black text-[10px] uppercase tracking-widest bg-black text-white hover:bg-primary transition-all shadow-soft active:scale-95 shrink-0"
            >
              <ShieldCheck size={16} strokeWidth={2.5} />
              Dashboard Shipper
            </Link>
          )}

          {isAuthenticated ? (
            <Link
              to="/profile"
              className="w-11 h-11 rounded-full border-2 border-white shadow-soft hover:border-primary transition-all overflow-hidden"
            >
              <img
                src={getUserAvatarUrl()}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </Link>
          ) : (
            <Link
              to="/auth/login"
              className="w-11 h-11 bg-white border border-gray-100 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-soft hover:-translate-y-1 active:scale-95 text-gray-700"
            >
              <User size={22} strokeWidth={2.5} />
            </Link>
          )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(0px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(2px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(2px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(0deg); }
        }
        .animate-shake {
          animation: shake 0.5s;
          animation-iteration-count: 1;
        }
      `}</style>
    </header>
  );
};

export default Header;
