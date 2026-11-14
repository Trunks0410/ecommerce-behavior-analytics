import ProductCard from "@/shared/components/ui/ProductCard";
import {
  Star,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Store,
  MessageCircle,
  AlertTriangle,
  ShoppingCart,
  Zap,
  Check,
  Plus,
  Minus,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  useProductDetail,
  useSimilarProducts,
  useToggleFavorite,
  useRecordView,
} from "@/hooks/useProducts";
import { formatViewCount, formatPrice } from "@/shared/utils/format";
import { useAddToCart } from "@/hooks/useCart";
import { useAppSelector } from "@/app/stores/hooks";
import { useFavorites } from "@/hooks/useUser";
import { useProductReviews } from "@/hooks/useReviews";
import { useQuery } from "@tanstack/react-query";
import { vendorService } from "@/services/vendorService";
import { useLanguage } from "@/shared/context/LanguageContext";

const DEFAULT_SHOP_LOGO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='128' height='128'><rect width='100' height='100' fill='%23FFE4D6' stroke='black' stroke-width='4'/><path d='M20 40 L50 15 L80 40 L80 85 L20 85 Z' fill='white' stroke='black' stroke-width='4'/><rect x='40' y='55' width='20' height='30' fill='%23D97736' stroke='black' stroke-width='4'/><path d='M15 40 L85 40' stroke='black' stroke-width='4'/></svg>";

const ProductDetailPage = () => {
  const { id: slug } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const [addMessage, setAddMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);
  const user = useAppSelector((state) => state.auth.user);
  const isShipper =
    (typeof user?.role === "string"
      ? user.role.toLowerCase() === "shipper"
      : user?.role?.role_name?.toLowerCase() === "shipper") ||
    user?.email?.includes("shipper");

  const addToCartMutation = useAddToCart();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  // Gọi API lấy thông tin chi tiết sản phẩm và sản phẩm tương tự
  const { data: product, isLoading, error } = useProductDetail(slug || "");
  const { data: similarProducts } = useSimilarProducts(slug || "");

  // API hooks
  const recordViewMutation = useRecordView();
  const toggleFavoriteMutation = useToggleFavorite();
  const { data: favorites } = useFavorites();

  // Tab reviews
  const [reviewPage, setReviewPage] = useState(1);
  const { data: reviewsData } = useProductReviews(
    product?.id || 0,
    reviewPage,
    5,
  );

  // Ghi nhận lượt xem 1 lần khi load product thành công
  useEffect(() => {
    if (product?.id) {
      recordViewMutation.mutate(product.id);
    }
  }, [product?.id]);

  const isFavorite = favorites?.some((f: any) => f.product_id === product?.id);

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      navigate("/auth/login?redirect=" + window.location.pathname);
      return;
    }
    if (product?.id) {
      toggleFavoriteMutation.mutate(product.id);
    }
  };

  // Gọi API lấy thông tin chi tiết của Shop sở hữu sản phẩm này
  const { data: shopProfileRes } = useQuery({
    queryKey: ["shop-profile", product?.shop_id],
    queryFn: () => vendorService.getShopProfile(product!.shop_id!),
    enabled: !!product?.shop_id,
  });
  const shopInfo = shopProfileRes?.data || product?.shop;

  // Tự động chọn biến thể đầu tiên khi load xong sản phẩm
  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      if (firstVariant.color) setSelectedColor(firstVariant.color);
      if (firstVariant.size) setSelectedSize(firstVariant.size);
    }
    setActiveImgIndex(0);
    setQuantity(1);
  }, [product]);

  // Gom tất cả ảnh từ ảnh sản phẩm chính + ảnh từ các biến thể
  const imgs = useMemo(() => {
    const mainImages = product?.images
      ? product.images.filter((img: any) => img.is_primary).map((img: any) => img.image_url)
      : [];
    if (mainImages.length === 0 && product?.images && product.images.length > 0) {
      mainImages.push(product.images[0].image_url);
    }

    const colorImagesMap = new Map<string, string>();
    if (product?.variants) {
      product.variants.forEach((v: any) => {
        if (v.image_url && v.color) {
          const normalizedColor = v.color.trim().toLowerCase();
          if (!colorImagesMap.has(normalizedColor)) {
            colorImagesMap.set(normalizedColor, v.image_url);
          }
        }
      });
    }
    const uniqueVariantImages = Array.from(colorImagesMap.values());

    const variantUrlsSet = new Set(
      product?.variants?.map((v: any) => v.image_url).filter(Boolean) || []
    );
    const extraGalleryImages = product?.images
      ? product.images
        .filter((img: any) => !img.is_primary && !variantUrlsSet.has(img.image_url))
        .map((img: any) => img.image_url)
      : [];

    const rawImgs = Array.from(new Set([...mainImages, ...extraGalleryImages, ...uniqueVariantImages])).filter(Boolean);

    if (rawImgs.length === 0) {
      rawImgs.push("https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600");
    }

    return rawImgs.map((imgUrl) => {
      if (!imgUrl) return "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600";
      return imgUrl.startsWith("http") || imgUrl.startsWith("data:")
        ? imgUrl
        : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
    });
  }, [product]);

  // Đồng bộ màu sắc từ chỉ mục ảnh
  const syncColorFromImageIndex = (index: number) => {
    if (index < 0 || index >= imgs.length || !product?.variants) return;
    const currentImgUrl = imgs[index];
    const matchedVariant = product.variants.find((v: any) => {
      if (!v.image_url) return false;
      const formattedUrl = v.image_url.startsWith("http") || v.image_url.startsWith("data:")
        ? v.image_url
        : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${v.image_url.startsWith("/") ? "" : "/"}${v.image_url}`;
      return formattedUrl === currentImgUrl;
    });
    if (matchedVariant && matchedVariant.color && matchedVariant.color !== selectedColor) {
      setSelectedColor(matchedVariant.color);
    }
  };

  // Chọn màu sắc -> chuyển ảnh tương ứng
  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    if (product?.variants) {
      const variantWithImg = product.variants.find(
        (v: any) => v.color === colorName && v.image_url
      );
      if (variantWithImg && variantWithImg.image_url) {
        const formattedUrl = variantWithImg.image_url.startsWith("http") || variantWithImg.image_url.startsWith("data:")
          ? variantWithImg.image_url
          : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${variantWithImg.image_url.startsWith("/") ? "" : "/"}${variantWithImg.image_url}`;

        const idx = imgs.indexOf(formattedUrl);
        if (idx !== -1) {
          setActiveImgIndex(idx);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="animate-spin inline-block w-10 h-10 border-4 border-[#ee4d2d] border-t-transparent rounded-full mb-4" />
        <h2 className="text-base font-bold text-gray-700 dark:text-slate-300">
          {t("loading_product_details")}
        </h2>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center space-y-4">
        <AlertTriangle className="w-14 h-14 mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          {t("product_not_found")}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {t("product_not_found_desc")}
        </p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-2.5 bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
        >
          {t("back_to_products")}
        </Link>
      </div>
    );
  }

  // Khai báo các biến bổ trợ
  const colorsData = product.variants
    ? Array.from(
      new Map(
        product.variants.map((v) => [v.color, v.color_hex || "#888888"]),
      ).entries(),
    ).map(([name, hex]) => ({ name, hex }))
    : [];

  const sizes = Array.from(
    new Set(product.variants?.map((v) => v.size).filter(Boolean)),
  );

  // Tìm variant khớp với màu và size đang chọn
  const activeVariant = product.variants?.find(
    (v) => v.color === selectedColor && v.size === selectedSize,
  );

  const basePrice = activeVariant?.price
    ? Number(activeVariant.price)
    : Number(product.price);

  const displayPrice = activeVariant
    ? (activeVariant.sale_price ? Number(activeVariant.sale_price) : Number(activeVariant.price))
    : (product.sale_price ? Number(product.sale_price) : Number(product.price));

  const isSale = activeVariant
    ? !!activeVariant.sale_price
    : !!product.sale_price;

  const discountPercent = isSale
    ? Math.round(((basePrice - (activeVariant?.sale_price ? Number(activeVariant.sale_price) : Number(product.sale_price!))) / basePrice) * 100)
    : 0;

  const currentStock = activeVariant
    ? activeVariant.stock_quantity
    : product.totalStock || product.stock_quantity || 0;

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    if (newQty > currentStock) return;
    setQuantity(newQty);
  };

  const handleThumbnailClick = (index: number) => {
    setActiveImgIndex(index);
    syncColorFromImageIndex(index);
  };

  const handlePrevImg = () => {
    const newIndex = (activeImgIndex - 1 + imgs.length) % imgs.length;
    setActiveImgIndex(newIndex);
    syncColorFromImageIndex(newIndex);
  };

  const handleNextImg = () => {
    const newIndex = (activeImgIndex + 1) % imgs.length;
    setActiveImgIndex(newIndex);
    syncColorFromImageIndex(newIndex);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* 1. BREADCRUMBS */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link to="/" className="hover:text-[#ee4d2d] transition-colors font-medium">
          {t("breadcrumb_home")}
        </Link>
        <ChevronRight size={13} className="text-gray-400" />
        <Link to="/products" className="hover:text-[#ee4d2d] transition-colors font-medium">
          {t("breadcrumb_products")}
        </Link>
        <ChevronRight size={13} className="text-gray-400" />
        {product.category?.name && (
          <>
            <Link
              to={`/products?category=${product.category.slug}`}
              className="hover:text-[#ee4d2d] transition-colors font-medium"
            >
              {product.category.name}
            </Link>
            <ChevronRight size={13} className="text-gray-400" />
          </>
        )}
        <span className="text-gray-800 dark:text-slate-200 font-bold truncate max-w-sm sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* 2. MAIN PRODUCT SECTION (GALLERY + INFO) */}
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-xl p-5 sm:p-7 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Gallery Cột Trái (5/12) */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Ảnh lớn chính */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 group">
              <img
                src={imgs[activeImgIndex]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Mũi tên trượt ảnh */}
              <button
                onClick={handlePrevImg}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Ảnh trước"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNextImg}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Ảnh tiếp"
              >
                <ChevronRight size={18} />
              </button>

              {/* Tag giảm giá */}
              {isSale && discountPercent > 0 && (
                <div className="absolute top-3 right-3 bg-[#ee4d2d] text-white text-[11px] font-black px-2 py-0.5 rounded shadow-sm">
                  -{discountPercent}%
                </div>
              )}
            </div>

            {/* Hàng ảnh thu nhỏ (Thumbnails) */}
            <div className="grid grid-cols-5 gap-2">
              {imgs.slice(0, 5).map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleThumbnailClick(i)}
                  className={`aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer ${
                    i === activeImgIndex
                      ? "border-2 border-[#ee4d2d] shadow-xs"
                      : "border-gray-200 dark:border-slate-700 hover:border-[#ee4d2d]/60 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Thông tin Cột Phải (7/12) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Header: Badge & Yêu thích */}
            <div className="flex items-center justify-between gap-3">
              <span className="bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {product.is_new
                  ? t("badge_new_arrival")
                  : product.sold_count > 15
                    ? t("badge_best_seller")
                    : "MeeMart Mall"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`p-2 rounded-full border transition-colors cursor-pointer ${
                    isFavorite
                      ? "border-red-200 bg-red-50 text-red-500 dark:bg-red-950/40"
                      : "border-gray-200 dark:border-slate-700 text-gray-500 hover:text-[#ee4d2d] hover:border-[#ee4d2d]"
                  }`}
                  title="Yêu thích"
                >
                  <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert("Đã sao chép liên kết sản phẩm!");
                  }}
                  className="p-2 rounded-full border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-[#ee4d2d] hover:border-[#ee4d2d] transition-colors cursor-pointer"
                  title="Chia sẻ"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* Tên sản phẩm */}
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-slate-100 leading-snug">
              {product.name}
            </h1>

            {/* Thanh xếp hạng sao, đánh giá, lượt xem, đã bán */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-slate-400 pb-3 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-[#ee4d2d]">
                <span className="font-extrabold underline text-sm">{Number(product.rating_average || 4.8).toFixed(1)}</span>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={i < Math.round(Number(product.rating_average || 5)) ? "fill-amber-400" : "fill-gray-200 text-gray-200"}
                    />
                  ))}
                </div>
              </div>
              <span className="text-gray-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className="hover:text-[#ee4d2d] cursor-pointer"
              >
                <strong className="text-gray-900 dark:text-slate-200 font-bold">{product.review_count || 0}</strong> {t("reviews_count")}
              </button>
              <span className="text-gray-300 dark:text-slate-700">|</span>
              <span>
                <strong className="text-gray-900 dark:text-slate-200 font-bold">{formatViewCount(product.view_count)}</strong> {t("views_count")}
              </span>
              <span className="text-gray-300 dark:text-slate-700">|</span>
              <span>
                <strong className="text-gray-900 dark:text-slate-200 font-bold">{product.sold_count || 0}</strong> {t("sold_count")}
              </span>
            </div>

            {/* Khung Giá Shopee */}
            <div className="bg-[#fafafa] dark:bg-slate-900/60 p-4 rounded-xl border border-gray-100 dark:border-slate-700/60 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#ee4d2d]">
                {formatPrice(displayPrice)}
              </span>
              {isSale && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(basePrice)}
                  </span>
                  <span className="text-xs font-bold text-[#ee4d2d] bg-[#fef0ed] dark:bg-[#ee4d2d]/20 px-2 py-0.5 rounded">
                    -{discountPercent}% {t("discount")}
                  </span>
                </>
              )}
            </div>

            {/* Chọn Biến thể (Màu sắc & Kích thước) */}
            <div className="space-y-4 pt-1">
              {/* Màu sắc */}
              {colorsData.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    <span className="font-semibold text-gray-800 dark:text-slate-200">{t("select_color")}</span>{" "}
                    <span className="font-bold text-[#ee4d2d]">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colorsData.map((c) => {
                      const isSelected = selectedColor === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleColorSelect(c.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "border-[#ee4d2d] bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] shadow-2xs"
                              : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:border-[#ee4d2d]"
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.name}</span>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Kích thước */}
              {sizes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    <span className="font-semibold text-gray-800 dark:text-slate-200">{t("select_size")}</span>{" "}
                    <span className="font-bold text-[#ee4d2d]">{selectedSize}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => {
                      const isSelected = selectedSize === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSize(s as string)}
                          className={`min-w-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#ee4d2d] bg-[#fef0ed] dark:bg-[#ee4d2d]/20 text-[#ee4d2d] shadow-2xs font-bold"
                              : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:border-[#ee4d2d]"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Số lượng */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                    {t("quantity")}
                  </span>
                  <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => handleQuantityChange(quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="text"
                      readOnly
                      value={quantity}
                      className="w-12 h-8 text-center text-xs font-bold bg-transparent outline-none text-gray-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      disabled={quantity >= currentStock}
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">
                    {currentStock > 0 ? `${currentStock} ${t("in_stock")}` : t("out_of_stock")}
                  </span>
                </div>
              </div>
            </div>

            {/* Thông báo thêm giỏ hàng */}
            {addMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold transition-all ${
                  addMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                }`}
              >
                {addMessage.text}
              </div>
            )}

            {isShipper && (
              <div className="p-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                {t("shipper_warning")}
              </div>
            )}

            {/* Nút hành động Mua & Thêm vào giỏ */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-3">
              <button
                type="button"
                disabled={currentStock === 0 || addToCartMutation.isPending || isShipper}
                onClick={() => {
                  addToCartMutation.mutate(
                    {
                      productId: product.id,
                      variantId: activeVariant?.id,
                      quantity,
                      product,
                      variant: activeVariant,
                    },
                    {
                      onSuccess: () => {
                        window.dispatchEvent(new CustomEvent("cart-item-added"));
                        setAddMessage({
                          type: "success",
                          text: t("add_to_cart_success"),
                        });
                        setTimeout(() => setAddMessage(null), 3000);
                      },
                      onError: (err: any) => {
                        setAddMessage({
                          type: "error",
                          text: err?.response?.data?.message || t("add_to_cart_failed"),
                        });
                        setTimeout(() => setAddMessage(null), 3000);
                      },
                    },
                  );
                }}
                className="flex-1 min-h-[46px] rounded-lg border border-[#ee4d2d] bg-[#fef0ed] dark:bg-[#ee4d2d]/15 text-[#ee4d2d] hover:bg-[#fde2dc] dark:hover:bg-[#ee4d2d]/25 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <ShoppingCart size={16} />
                <span>{addToCartMutation.isPending ? t("adding_to_cart") : t("add_to_cart")}</span>
              </button>

              <button
                type="button"
                disabled={currentStock === 0 || isShipper}
                onClick={() => {
                  if (!isAuthenticated) {
                    sessionStorage.setItem(
                      "buyNowItem",
                      JSON.stringify({
                        id: -1,
                        product_id: product.id,
                        product_variant_id: activeVariant?.id || null,
                        quantity,
                        unit_price: displayPrice,
                        product,
                        variant: activeVariant,
                      }),
                    );
                    navigate("/auth/login?redirect=/checkout&buyNow=1");
                    return;
                  }

                  navigate("/checkout", {
                    state: {
                      buyNowItem: {
                        id: -1,
                        product_id: product.id,
                        product_variant_id: activeVariant?.id || null,
                        quantity,
                        unit_price: displayPrice,
                        product,
                        variant: activeVariant,
                      },
                    },
                  });
                }}
                className="flex-1 min-h-[46px] rounded-lg bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <Zap size={16} />
                <span>{t("buy_now")}</span>
              </button>
            </div>

            {/* Cam kết dịch vụ */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-slate-700 text-center">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck size={20} className="text-[#ee4d2d]" />
                <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200">
                  {t("guarantee_authentic")}
                </span>
                <span className="text-[10px] text-gray-400">{t("guarantee_authentic_sub")}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Truck size={20} className="text-blue-500" />
                <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200">
                  {t("guarantee_shipping")}
                </span>
                <span className="text-[10px] text-gray-400">{t("guarantee_shipping_sub")}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RotateCcw size={20} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200">
                  {t("guarantee_return")}
                </span>
                <span className="text-[10px] text-gray-400">{t("guarantee_return_sub")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THÔNG TIN SHOP (SHOPEE MALL STYLE) */}
      <section className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-xl p-5 shadow-xs flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-16 h-16 rounded-full border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 shrink-0">
            <img
              src={shopInfo?.shop_logo || shopInfo?.avatar_url || DEFAULT_SHOP_LOGO}
              alt={shopInfo?.shop_name || "Shop Avatar"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-gray-900 dark:text-slate-100">
              {shopInfo?.shop_name || shopInfo?.name || "MeeMart Official"}
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("shop_online")}
              </span>
              <span className="text-gray-400 text-[11px]">
                {shopInfo?.address?.split(",").pop()?.trim() || "TP. Hồ Chí Minh"}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {shopInfo?.id ? (
                <Link
                  to={`/shop/${shopInfo.id}`}
                  className="px-3 py-1 rounded-md border border-[#ee4d2d] text-[#ee4d2d] bg-[#fef0ed] dark:bg-[#ee4d2d]/15 text-xs font-semibold hover:bg-[#fde2dc] transition-colors flex items-center gap-1"
                >
                  <Store size={12} />
                  <span>{t("view_shop")}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-3 py-1 rounded-md border border-gray-200 text-gray-400 text-xs font-semibold cursor-not-allowed flex items-center gap-1"
                >
                  <Store size={12} />
                  <span>{t("view_shop")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (shopInfo?.id) {
                    window.dispatchEvent(
                      new CustomEvent("openChat", {
                        detail: {
                          shopId: shopInfo.id,
                          shopName: shopInfo.shop_name || shopInfo.name || "MeeMart Store",
                          shopLogo: shopInfo.shop_logo || shopInfo.avatar_url || "",
                        },
                      }),
                    );
                  }
                }}
                className="px-3 py-1 rounded-md border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:text-[#ee4d2d] hover:border-[#ee4d2d] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle size={12} />
                <span>{t("chat_now")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Cột Thống kê Shop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700 md:pl-8 text-center sm:text-left">
          <div>
            <span className="text-[11px] text-gray-400 block">{t("rating")}</span>
            <span className="text-sm font-bold text-[#ee4d2d]">
              {shopInfo?.rating ? `${Number(shopInfo.rating).toFixed(1)}/5` : "4.9/5"}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block">{t("products_count")}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
              {shopInfo?.productsCount !== undefined ? String(shopInfo.productsCount) : "128"}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block">{t("response_rate")}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
              {shopInfo?.response_rate !== undefined ? `${shopInfo.response_rate}%` : "98%"}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-gray-400 block">{t("joined")}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
              {shopInfo?.created_at
                ? new Date().getFullYear() - new Date(shopInfo.created_at).getFullYear() > 0
                  ? `${new Date().getFullYear() - new Date(shopInfo.created_at).getFullYear()} năm`
                  : "Mới"
                : "2 năm"}
            </span>
          </div>
        </div>
      </section>

      {/* 4. TABS CHI TIẾT (MÔ TẢ, THÔNG SỐ, ĐÁNH GIÁ, ĐỔI TRẢ) */}
      <section className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-xs">
        {/* Thanh tiêu đề tabs */}
        <div className="flex border-b border-gray-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
          {[
            { id: "description", label: t("tab_description") },
            { id: "specs", label: t("tab_specs") },
            { id: "reviews", label: `${t("tab_reviews")} (${product.review_count || 0})` },
            { id: "returns", label: t("tab_returns") },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                  isActive
                    ? "border-[#ee4d2d] text-[#ee4d2d] bg-[#fef0ed]/30 dark:bg-[#ee4d2d]/10"
                    : "border-transparent text-gray-600 dark:text-slate-400 hover:text-[#ee4d2d]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Nội dung tab */}
        <div className="p-6 sm:p-8">
          {/* Tab 1: Mô tả */}
          {activeTab === "description" && (
            <div className="space-y-6 max-w-4xl">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                {product.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {product.description || t("product_description_missing")}
              </p>
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold uppercase text-gray-900 dark:text-slate-200">
                  {t("product_highlights")}
                </h4>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
                  {[
                    t("product_highlight_1"),
                    t("product_highlight_2"),
                    t("product_highlight_3"),
                    t("product_highlight_4"),
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ee4d2d]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tab 2: Thông số kỹ thuật */}
          {activeTab === "specs" && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                {t("tab_specs")}
              </h3>
              <div className="border border-gray-100 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <tbody>
                    <tr className="border-b border-gray-100 dark:border-slate-700/60 bg-gray-50/50 dark:bg-slate-900/40">
                      <td className="py-2.5 px-4 font-semibold text-gray-500 dark:text-slate-400 w-1/3">
                        {t("product_brand")}
                      </td>
                      <td className="py-2.5 px-4 text-gray-900 dark:text-slate-100 font-medium">
                        {product.brand?.name || "MeeMart Fashion"}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-slate-700/60">
                      <td className="py-2.5 px-4 font-semibold text-gray-500 dark:text-slate-400 w-1/3">
                        {t("product_material")}
                      </td>
                      <td className="py-2.5 px-4 text-gray-900 dark:text-slate-100 font-medium">
                        {product.material || t("product_material_default")}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-slate-700/60 bg-gray-50/50 dark:bg-slate-900/40">
                      <td className="py-2.5 px-4 font-semibold text-gray-500 dark:text-slate-400 w-1/3">
                        {t("product_audience")}
                      </td>
                      <td className="py-2.5 px-4 text-gray-900 dark:text-slate-100 font-medium">
                        {product.gender === "MALE"
                          ? "Nam"
                          : product.gender === "FEMALE"
                            ? "Nữ"
                            : "Dành cho mọi đối tượng"}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-slate-700/60">
                      <td className="py-2.5 px-4 font-semibold text-gray-500 dark:text-slate-400 w-1/3">
                        {t("product_category")}
                      </td>
                      <td className="py-2.5 px-4 text-gray-900 dark:text-slate-100 font-medium">
                        {product.category?.name || "MeeMart Store"}
                      </td>
                    </tr>
                    {product.attributes?.map((attr, idx) => (
                      <tr
                        key={attr.id}
                        className={`border-b border-gray-100 dark:border-slate-700/60 last:border-0 ${
                          idx % 2 === 1 ? "bg-gray-50/50 dark:bg-slate-900/40" : ""
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-gray-500 dark:text-slate-400 w-1/3">
                          {attr.attr_name}
                        </td>
                        <td className="py-2.5 px-4 text-gray-900 dark:text-slate-100 font-medium">
                          {attr.attr_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Đánh giá */}
          {activeTab === "reviews" && (
            <div className="space-y-6 max-w-4xl">
              {/* Tóm tắt điểm số */}
              <div className="bg-[#fbfbfb] dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 p-5 rounded-xl flex flex-wrap items-center gap-6">
                <div className="text-center sm:pr-6 sm:border-r border-gray-200 dark:border-slate-700">
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#ee4d2d]">
                    {Number(product.rating_average || 4.8).toFixed(1)}
                  </div>
                  <div className="flex justify-center text-amber-400 my-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={15}
                        className={i < Math.round(Number(product.rating_average || 5)) ? "fill-amber-400" : "fill-gray-200 text-gray-200"}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    {product.review_count || 0} {t("reviews_count")}
                  </span>
                </div>

                <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                  <p className="font-semibold text-gray-800 dark:text-slate-200">
                    {t("verified_customer_ratings")}
                  </p>
                  <p>{t("review_policy")}</p>
                </div>
              </div>

              {/* Danh sách bình luận */}
              <div className="space-y-4">
                {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                  reviewsData.reviews.map((review: any) => (
                    <div
                      key={review.id}
                      className="border-b border-gray-100 dark:border-slate-700/60 pb-5 last:border-0 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-gray-500">
                            {review.user?.profile?.avatar_url ? (
                              <img
                                src={
                                  review.user.profile.avatar_url.startsWith("http")
                                    ? review.user.profile.avatar_url
                                    : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${review.user.profile.avatar_url}`
                                }
                                alt="User Avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              review.user?.email?.[0].toUpperCase() || "U"
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-slate-100">
                              {review.user?.profile?.full_name || review.user?.email?.split("@")[0] || "Người mua MeeMart"}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={11}
                                    className={i < review.rating ? "fill-amber-400" : "fill-gray-200 text-gray-200"}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {new Date(review.created_at).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed pl-12">
                        {review.comment}
                      </p>

                      {/* Phản hồi từ shop */}
                      {review.vendor_reply && (
                        <div className="ml-12 mt-2 bg-gray-50 dark:bg-slate-900 border-l-2 border-[#ee4d2d] p-3 rounded-r-lg text-xs space-y-1">
                          <span className="text-[10px] font-bold text-[#ee4d2d] uppercase">
                            {t("seller_reply")}
                          </span>
                          <p className="text-gray-600 dark:text-slate-300">{review.vendor_reply}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 space-y-1">
                    <p className="text-xs font-bold text-gray-600 dark:text-slate-300">
                      {t("no_reviews_title")}
                    </p>
                    <p className="text-xs">{t("no_reviews_desc")}</p>
                  </div>
                )}
              </div>

              {/* Phân trang đánh giá */}
              {reviewsData && reviewsData.totalPages > 1 && (
                <div className="flex justify-center gap-1.5 pt-4">
                  {[...Array(reviewsData.totalPages)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReviewPage(i + 1)}
                      className={`w-7 h-7 rounded text-xs font-bold transition-colors cursor-pointer ${
                        reviewPage === i + 1
                          ? "bg-[#ee4d2d] text-white"
                          : "border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-[#ee4d2d]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Chính sách đổi trả */}
          {activeTab === "returns" && (
            <div className="max-w-3xl space-y-4 text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                {t("tab_returns")}
              </h3>
              <p>{t("return_policy_intro")}</p>
              <ul className="space-y-2.5 pt-2">
                {[
                  t("return_policy_1"),
                  t("return_policy_2"),
                  t("return_policy_3"),
                  t("return_policy_4"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* 5. SẢN PHẨM TƯƠNG TỰ (SIMILAR PRODUCTS) */}
      {similarProducts && similarProducts.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ee4d2d]">
                {t("similar_products_tag")}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                {t("similar_products_title")}
              </h2>
            </div>
            <Link
              to={`/products?category=${product.category?.slug || ""}`}
              className="text-xs text-[#ee4d2d] hover:underline font-semibold flex items-center gap-0.5"
            >
              <span>{t("view_all")}</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
            {similarProducts.slice(0, 8).map((p: any) => (
              <ProductCard
                key={p.id}
                id={p.slug || String(p.id)}
                name={p.name}
                price={Number(p.sale_price || p.price)}
                originalPrice={p.sale_price ? Number(p.price) : undefined}
                image={p.images?.[0]?.image_url || "/placeholder.jpg"}
                category={p.category?.name || "MeeMart"}
                rating={Number(p.rating_average || 5)}
                sales={Number(p.sold_count || 12)}
                badge={p.is_new ? t("badge_new_arrival") : p.sold_count > 15 ? t("badge_best_seller") : undefined}
                shop={p.shop}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
