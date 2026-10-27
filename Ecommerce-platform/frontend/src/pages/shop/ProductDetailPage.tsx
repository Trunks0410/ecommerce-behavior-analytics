import ProductCard from "@/shared/components/ui/ProductCard";
import {
  Star,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Store,
  MessageCircle,
  AlertTriangle,
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

const DEFAULT_SHOP_LOGO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='128' height='128'><rect width='100' height='100' fill='%23FFE4D6' stroke='black' stroke-width='4'/><path d='M20 40 L50 15 L80 40 L80 85 L20 85 Z' fill='white' stroke='black' stroke-width='4'/><rect x='40' y='55' width='20' height='30' fill='%23D97736' stroke='black' stroke-width='4'/><path d='M15 40 L85 40' stroke='black' stroke-width='4'/></svg>";

const ProductDetailPage = () => {
  const { id: slug } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  // Khởi tạo các hook API mới
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

  // Gom tất cả ảnh từ ảnh sản phẩm chính + ảnh từ các biến thể (đảm bảo không bị trùng lặp và không lặp lại ảnh cùng màu sắc)
  const imgs = useMemo(() => {
    // 1. Lấy ảnh chính (is_primary === true) hoặc ảnh đầu tiên
    const mainImages = product?.images
      ? product.images.filter((img: any) => img.is_primary).map((img: any) => img.image_url)
      : [];
    if (mainImages.length === 0 && product?.images && product.images.length > 0) {
      mainImages.push(product.images[0].image_url);
    }

    // 2. Thu thập ảnh biến thể duy nhất (mỗi màu sắc 1 ảnh)
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

    // 3. Thu thập các ảnh gallery phụ khác của sản phẩm mà không trùng với các ảnh biến thể
    const variantUrlsSet = new Set(
      product?.variants?.map((v: any) => v.image_url).filter(Boolean) || []
    );
    const extraGalleryImages = product?.images
      ? product.images
        .filter((img: any) => !img.is_primary && !variantUrlsSet.has(img.image_url))
        .map((img: any) => img.image_url)
      : [];

    // 4. Kết hợp: ảnh chính + ảnh gallery phụ + ảnh biến thể duy nhất theo màu
    const rawImgs = Array.from(new Set([...mainImages, ...extraGalleryImages, ...uniqueVariantImages])).filter(Boolean);

    if (rawImgs.length === 0) {
      rawImgs.push("https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400");
    }

    return rawImgs.map((imgUrl) => {
      if (!imgUrl) return "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400";
      return imgUrl.startsWith('http') || imgUrl.startsWith('data:')
        ? imgUrl
        : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
    });
  }, [product]);

  // Đồng bộ màu sắc từ chỉ mục ảnh
  const syncColorFromImageIndex = (index: number) => {
    if (index < 0 || index >= imgs.length || !product?.variants) return;
    const currentImgUrl = imgs[index];
    const matchedVariant = product.variants.find((v: any) => {
      if (!v.image_url) return false;
      const formattedUrl = v.image_url.startsWith('http') || v.image_url.startsWith('data:')
        ? v.image_url
        : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${v.image_url.startsWith('/') ? '' : '/'}${v.image_url}`;
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
        const formattedUrl = variantWithImg.image_url.startsWith('http') || variantWithImg.image_url.startsWith('data:')
          ? variantWithImg.image_url
          : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${variantWithImg.image_url.startsWith('/') ? '' : '/'}${variantWithImg.image_url}`;

        const idx = imgs.indexOf(formattedUrl);
        if (idx !== -1) {
          setActiveImgIndex(idx);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-primary rounded-full mb-6"></div>
        <h2 className="font-serif font-black text-3xl uppercase tracking-tighter">
          Đang tải chi tiết...
        </h2>
        <p className="text-gray-400 font-bold text-sm mt-2">
          Vui lòng chờ trong giây lát
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center space-y-6">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
        <h2 className="font-serif font-black text-3xl uppercase tracking-tighter">
          Không tìm thấy sản phẩm!
        </h2>
        <p className="text-gray-400 font-bold text-sm">
          Sản phẩm có thể đã ngừng bán hoặc đường dẫn không tồn tại.
        </p>
        <Link
          to="/products"
          className="btn-brutal px-8 py-3 text-xs uppercase tracking-widest inline-block"
        >
          Quay lại cửa hàng
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
    : product.price;

  const displayPrice = activeVariant
    ? (activeVariant.sale_price ? Number(activeVariant.sale_price) : Number(activeVariant.price))
    : (product.sale_price ? Number(product.sale_price) : Number(product.price));

  const isSale = activeVariant
    ? !!activeVariant.sale_price
    : !!product.sale_price;

  const discountPercent = isSale
    ? Math.round(((basePrice - (activeVariant?.sale_price ? Number(activeVariant.sale_price) : product.sale_price!)) / basePrice) * 100)
    : 0;

  const currentStock = activeVariant
    ? activeVariant.stock_quantity
    : product.totalStock || product.stock_quantity || 0;

  // Điều chỉnh số lượng khi đổi variant
  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    if (newQty > currentStock) return;
    setQuantity(newQty);
  };


  // const imgs =
  //   product.images && product.images.length > 0
  //     ? product.images.map((img) =>
  //         img.image_url.startsWith("http") || img.image_url.startsWith("data:")
  //           ? img.image_url
  //           : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${img.image_url.startsWith("/") ? "" : "/"}${img.image_url}`,
  //       )
  //     : ["/placeholder.jpg"];


  // Click chọn ảnh ở gallery -> tự động chọn màu sắc tương ứng (nếu ảnh thuộc về màu đó)
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
    <div className="max-w-7xl mx-auto px-6 py-12 pb-32">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] mb-12 text-gray-400">
        <Link to="/" className="hover:text-primary transition-colors">
          TRANG CHỦ
        </Link>
        <span className="text-black">/</span>
        <span className="text-black">SẢN PHẨM</span>
        <span className="text-black">/</span>
        <span className="text-black">{product.name.toUpperCase()}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 mb-32 items-start">
        {/* Gallery Section */}
        <div className="lg:w-1/2 space-y-8 w-full">
          <div className="relative aspect-[4/5] rounded-[3.5rem] overflow-hidden border-2 border-black shadow-brutal bg-gray-50 group">
            <img
              src={imgs[activeImgIndex]}
              alt={product.name}
              className="w-full h-full object-cover"
            />

            {/* Navigation Arrows */}
            <button
              onClick={handlePrevImg}
              className="absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 border-2 border-black rounded-2xl flex items-center justify-center shadow-subtle opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={handleNextImg}
              className="absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 border-2 border-black rounded-2xl flex items-center justify-center shadow-subtle opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
            >
              <ChevronRight size={32} />
            </button>

            {/* Discount Badge */}
            {isSale && (
              <div className="absolute top-10 right-10 w-20 h-20 bg-orange-500 text-white rounded-full border-2 border-black flex items-center justify-center font-black text-xl shadow-brutal -rotate-12">
                -{discountPercent}%
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-6">
            {imgs.map((img, i) => (
              <div
                key={i}
                onClick={() => handleThumbnailClick(i)}
                className={
                  "aspect-[4/5] rounded-[1.5rem] overflow-hidden cursor-pointer border-2 shadow-subtle transition-all border-black " +
                  (i === activeImgIndex
                    ? "shadow-none translate-x-1 translate-y-1 border-primary border-[3px]"
                    : "hover:border-primary hover:shadow-none hover:translate-x-1 hover:translate-y-1")
                }
              >
                <img
                  src={img}
                  alt={`${product.name} ${i}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="lg:w-1/2 flex flex-col pt-0 w-full">
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <span className="badge-brutal bg-primary text-white border-black px-4 py-2 rounded-md">
                {product.is_new
                  ? "Mới Về"
                  : product.sold_count > 15
                    ? "BÁN CHẠY NHẤT"
                    : "Sản Phẩm"}
              </span>
              <div className="flex gap-4">
                <button
                  onClick={handleToggleFavorite}
                  className={`w-14 h-14 bg-white border-2 border-black rounded-2xl shadow-subtle flex items-center justify-center transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${isFavorite ? "text-red-500 border-red-500 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] hover:bg-red-50" : "hover:bg-primary hover:text-white"}`}
                >
                  <Heart
                    size={24}
                    fill={isFavorite ? "currentColor" : "none"}
                  />
                </button>
                <button className="w-14 h-14 bg-white border-2 border-black rounded-2xl shadow-subtle flex items-center justify-center hover:bg-primary hover:text-white hover:shadow-none transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
                  <Share2 size={24} />
                </button>
              </div>
            </div>

            <h1 className="text-3xl lg:text-5xl font-serif font-black leading-tight tracking-tighter uppercase text-black">
              {product.name}
            </h1>

            <div className="flex items-center gap-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg border border-yellow-300">
                  <Star size={16} className="fill-yellow-500 text-yellow-500" />
                  <span className="font-black text-sm">
                    {Number(product.rating_average || 0).toFixed(1)}
                  </span>
                </div>
                <span
                  className="text-sm font-black text-gray-500 underline tracking-tighter cursor-pointer hover:text-primary"
                  onClick={() => setActiveTab("reviews")}
                >
                  {product.review_count || 0} ĐÁNH GIÁ
                </span>
              </div>
              <span className="text-sm font-black text-black underline tracking-tighter">
                {formatViewCount(product.view_count)} LƯỢT XEM
              </span>
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest border-l-2 border-black pl-10">
                ĐÃ BÁN: <span className="text-black">{product.sold_count}</span>
              </span>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <span className="text-3xl lg:text-4xl font-black text-primary">
                {formatPrice(displayPrice)}
              </span>
              {isSale && (
                <span className="text-xl text-gray-300 line-through decoration-black/10 font-bold">
                  {formatPrice(basePrice)}
                </span>
              )}
            </div>

            {/* Selection Box */}
            <div className="border-2 border-black rounded-[2.5rem] p-8 space-y-10 shadow-sm bg-white">
              {/* Colors */}
              {colorsData.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black">
                      MÀU SẮC:{" "}
                      <span className="text-gray-400 ml-2 font-bold uppercase">
                        {selectedColor}
                      </span>
                    </h4>
                  </div>
                  <div className="flex gap-4">
                    {colorsData.map((colorObj) => {
                      if (!colorObj.name) return null;
                      const isSelected = colorObj.name === selectedColor;
                      return (
                        <button
                          key={colorObj.name}
                          onClick={() => handleColorSelect(colorObj.name)}
                          className={
                            "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center " +
                            (isSelected
                              ? "border-black p-1"
                              : "border-transparent hover:border-gray-200")
                          }
                          title={colorObj.name}
                        >
                          <div
                            className="w-full h-full rounded-full border border-black/10"
                            style={{ backgroundColor: colorObj.hex }}
                          ></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {sizes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black">
                      KÍCH THƯỚC:
                    </h4>
                    <button className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-primary hover:text-black hover:border-black transition-colors">
                      Bảng size
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {sizes.map((size) => {
                      if (!size) return null;
                      const isSelected = size === selectedSize;
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={
                            "h-12 w-16 rounded-xl font-black text-sm transition-all border-2 border-black active:scale-95 " +
                            (isSelected
                              ? "bg-black text-white"
                              : "bg-white text-black hover:bg-gray-50")
                          }
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity & Actions */}
              <div className="space-y-8 pt-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center bg-white border-2 border-black rounded-lg h-12 overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={currentStock === 0}
                      className="w-12 h-full flex items-center justify-center hover:bg-gray-100 transition-all font-bold text-lg border-r-2 border-black disabled:opacity-50"
                    >
                      —
                    </button>
                    <span className="w-14 text-center font-black text-base">
                      {currentStock === 0 ? 0 : quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={currentStock === 0}
                      className="w-12 h-full flex items-center justify-center hover:bg-gray-100 transition-all font-bold text-lg border-l-2 border-black disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-col">
                    {currentStock > 0 ? (
                      <span className="text-[10px] font-black text-green-600 uppercase flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>{" "}
                        CÒN HÀNG ({currentStock} SẢN PHẨM)
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{" "}
                        HẾT HÀNG
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-gray-400 italic">
                      Miễn phí giao hàng cho đơn từ 500k
                    </span>
                  </div>
                </div>

                {addMessage && (
                  <div
                    className={`p-3 rounded-xl border-2 border-black text-xs font-black uppercase tracking-widest text-center ${addMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                  >
                    {addMessage.text}
                  </div>
                )}

                {isShipper && (
                  <div className="p-4 rounded-2xl border-2 border-red-500 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest text-center shadow-subtle">
                    Tài khoản Shipper không thể mua sắm trên cửa hàng
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    disabled={
                      currentStock === 0 ||
                      addToCartMutation.isPending ||
                      isShipper
                    }
                    onClick={() => {
                      addToCartMutation.mutate(
                        {
                          productId: product.id,
                          variantId: activeVariant?.id,
                          quantity,
                          product: product,
                          variant: activeVariant,
                        },
                        {
                          onSuccess: () => {
                            window.dispatchEvent(
                              new CustomEvent("cart-item-added"),
                            );
                            setAddMessage({
                              type: "success",
                              text: "Đã thêm sản phẩm vào giỏ hàng thành công!",
                            });
                            setTimeout(() => setAddMessage(null), 3000);
                          },
                          onError: (err: any) => {
                            setAddMessage({
                              type: "error",
                              text:
                                err?.response?.data?.message ||
                                "Thêm vào giỏ hàng thất bại!",
                            });
                            setTimeout(() => setAddMessage(null), 3000);
                          },
                        },
                      );
                    }}
                    className="flex-1 h-16 border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest bg-white hover:bg-primary hover:text-white transition-all active:translate-x-[2px] active:translate-y-[2px] flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {addToCartMutation.isPending
                      ? "Đang thêm..."
                      : "Thêm vào giỏ"}
                  </button>
                  <button
                    disabled={currentStock === 0 || isShipper}
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        // Lưu thông tin Buy Now vào sessionStorage để sau khi login xong có thể tự load lại
                        sessionStorage.setItem(
                          "buyNowItem",
                          JSON.stringify({
                            id: -1,
                            product_id: product.id,
                            product_variant_id: activeVariant?.id || null,
                            quantity,
                            unit_price: displayPrice,
                            product: product,
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
                            product: product,
                            variant: activeVariant,
                          },
                        },
                      });
                    }}
                    className="flex-1 h-16 bg-black text-white border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all active:translate-x-[2px] active:translate-y-[2px] flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Mua ngay
                  </button>
                </div>
              </div>
            </div>

            {/* Service Commitments */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t-2 border-black/5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 bg-orange-50 text-primary rounded-2xl flex items-center justify-center border-2 border-primary/20">
                  <ShieldCheck size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  Chính hãng 100%
                </span>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border-2 border-blue-200">
                  <Truck size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  Giao 2-4 ngày
                </span>
              </div>
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center border-2 border-green-200">
                  <RefreshCw size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  Đổi trả 15 ngày
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Information Section */}
      <section className="mb-24 mt-12 bg-white border-2 border-black rounded-[2.5rem] p-8 shadow-brutal flex flex-col md:flex-row gap-8 items-center">
        <div className="flex items-center gap-6 pr-8 md:border-r-2 md:border-black/5 shrink-0 w-full md:w-auto">
          <div className="w-20 h-20 bg-primary rounded-full border-2 border-black overflow-hidden shadow-subtle relative group shrink-0">
            <img
              src={
                shopInfo?.shop_logo || shopInfo?.avatar_url || DEFAULT_SHOP_LOGO
              }
              alt={shopInfo?.shop_name || shopInfo?.name || "Avatar"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            />
          </div>
          <div>
            <h4 className="text-xl font-serif font-black uppercase tracking-tighter mb-1">
              {shopInfo?.shop_name || shopInfo?.name || "UTEShop Official"}
            </h4>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>{" "}
                Online
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {shopInfo?.address?.split(",").pop()?.trim() ||
                  "TP. Hồ Chí Minh"}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              {shopInfo?.id ? (
                <Link
                  to={`/shop/${shopInfo.id}`}
                  className="px-5 py-2 bg-black text-white border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-2"
                >
                  <Store size={14} /> Xem Shop
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2 bg-gray-200 text-gray-400 border-2 border-gray-300 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-not-allowed"
                >
                  <Store size={14} /> Xem Shop
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
                          shopName:
                            shopInfo.shop_name ||
                            shopInfo.name ||
                            "UTEShop Official",
                          shopLogo:
                            shopInfo.shop_logo || shopInfo.avatar_url || "",
                        },
                      }),
                    );
                  }
                }}
                className="px-5 py-2 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-2"
              >
                <MessageCircle size={14} /> Chat ngay
              </button>
            </div>
          </div>
        </div>

        <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
          {[
            {
              label: "Đánh giá",
              value: shopInfo?.rating
                ? `${Number(shopInfo.rating).toFixed(1)}/5`
                : "4.9/5",
            },
            {
              label: "Sản phẩm",
              value:
                shopInfo?.productsCount !== undefined
                  ? String(shopInfo.productsCount)
                  : "128",
            },
            {
              label: "Tỉ lệ phản hồi",
              value:
                shopInfo?.response_rate !== undefined
                  ? `${shopInfo.response_rate}%`
                  : "98%",
            },
            {
              label: "Tham gia",
              value: shopInfo?.created_at
                ? new Date().getFullYear() -
                  new Date(shopInfo.created_at).getFullYear() >
                  0
                  ? `${new Date().getFullYear() - new Date(shopInfo.created_at).getFullYear()} năm`
                  : "Mới"
                : "4 năm",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center text-center"
            >
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">
                {stat.label}
              </p>
              <p className="text-lg font-black tracking-tighter text-black uppercase">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs & Description Container */}
      <section className="mb-32 mt-32 space-y-12">
        {/* Tabs */}
        <div className="bg-white border-2 border-black rounded-[2rem] p-3 flex gap-4 overflow-x-auto no-scrollbar shadow-subtle">
          {[
            { id: "description", label: "Mô tả sản phẩm" },
            { id: "specs", label: "Thông số kỹ thuật" },
            { id: "reviews", label: "Đánh giá sản phẩm" },
            { id: "returns", label: "Chính sách đổi trả" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                "px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap " +
                (activeTab === tab.id
                  ? "bg-black text-white shadow-brutal"
                  : "hover:bg-primary/10 text-gray-500")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === "description" && (
          <div className="bg-white border-2 border-black rounded-[3rem] p-12 md:p-20 shadow-brutal relative overflow-hidden group">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
              <div className="space-y-10">
                <h3 className="text-4xl md:text-5xl font-serif font-black leading-tight tracking-tighter uppercase">
                  Chất liệu cao cấp & <br /> Thiết kế vượt thời gian
                </h3>
                <p className="text-gray-500 leading-relaxed font-bold text-lg">
                  {product.description || "Chưa có mô tả chi tiết."}
                </p>
                <ul className="space-y-6 pt-6">
                  {[
                    "Kiểu dáng thời trang, hợp xu hướng giới trẻ",
                    "Đường may thủ công tỉ mỉ, độ bền vượt trội",
                    "Dễ dàng phối cùng nhiều loại trang phục khác nhau",
                    "Được kiểm duyệt chất lượng nghiêm ngặt trước khi xuất xưởng",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-6 text-base font-black"
                    >
                      <div className="w-4 h-4 bg-primary border-2 border-black rotate-45 shadow-subtle"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[3rem] overflow-hidden border-2 border-black shadow-subtle h-[500px] group-hover:shadow-brutal transition-all duration-500">
                <img
                  src={imgs[0]}
                  alt="Detail"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-primary/5 -skew-x-12 translate-x-20 pointer-events-none"></div>
          </div>
        )}

        {activeTab === "specs" && (
          <div className="bg-white border-2 border-black rounded-[3rem] p-12 md:p-20 shadow-brutal relative overflow-hidden">
            <div className="max-w-3xl relative z-10 space-y-8">
              <h3 className="text-4xl font-serif font-black uppercase tracking-tighter">
                Thông số kỹ thuật
              </h3>
              <div className="border-2 border-black p-8 bg-gray-50 rounded-2xl shadow-subtle">
                <table className="w-full text-left text-sm">
                  <tbody>
                    <tr className="border-b border-black/10">
                      <td className="py-3.5 font-bold uppercase text-gray-500 w-1/3">
                        Thương hiệu
                      </td>
                      <td className="py-3.5 text-gray-800 font-bold">
                        {product.brand?.name || "UTE FASHION"}
                      </td>
                    </tr>
                    <tr className="border-b border-black/10">
                      <td className="py-3.5 font-bold uppercase text-gray-500 w-1/3">
                        Chất liệu
                      </td>
                      <td className="py-3.5 text-gray-800 font-bold">
                        {product.material || "Chất liệu cao cấp"}
                      </td>
                    </tr>
                    <tr className="border-b border-black/10">
                      <td className="py-3.5 font-bold uppercase text-gray-500 w-1/3">
                        Giới tính
                      </td>
                      <td className="py-3.5 text-gray-800 font-bold uppercase">
                        {product.gender}
                      </td>
                    </tr>
                    <tr className="border-b border-black/10">
                      <td className="py-3.5 font-bold uppercase text-gray-500 w-1/3">
                        Danh mục
                      </td>
                      <td className="py-3.5 text-gray-800 font-bold">
                        {product.category?.name || "Cửa hàng"}
                      </td>
                    </tr>
                    {product.attributes?.map((attr) => (
                      <tr
                        key={attr.id}
                        className="border-b border-black/10 last:border-0"
                      >
                        <td className="py-3.5 font-bold uppercase text-gray-500 w-1/3">
                          {attr.attr_name}
                        </td>
                        <td className="py-3.5 text-gray-800 font-bold">
                          {attr.attr_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-primary/5 -skew-x-12 translate-x-20 pointer-events-none"></div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="bg-white border-2 border-black rounded-[3rem] p-12 md:p-20 shadow-brutal">
            <div className="max-w-4xl space-y-12">
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-serif font-black uppercase tracking-tighter">
                  Đánh giá sản phẩm
                </h3>
                <div className="flex items-center gap-4 bg-yellow-100 px-6 py-4 rounded-2xl border-2 border-yellow-300">
                  <span className="text-5xl font-black text-yellow-600">
                    {Number(product.rating_average || 0).toFixed(1)}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={20}
                          className={
                            i < Math.round(Number(product.rating_average || 0))
                              ? "fill-yellow-500 text-yellow-500"
                              : "fill-gray-200 text-gray-200"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-gray-500">
                      {product.review_count || 0} lượt đánh giá
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                  reviewsData.reviews.map((review: any) => (
                    <div
                      key={review.id}
                      className="border-2 border-black/10 rounded-3xl p-8 hover:border-black transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden bg-gray-100">
                            {review.user?.profile?.avatar_url ? (
                              <img
                                src={
                                  review.user.profile.avatar_url.startsWith(
                                    "http",
                                  )
                                    ? review.user.profile.avatar_url
                                    : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${review.user.profile.avatar_url}`
                                }
                                alt="Avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-xl text-gray-400">
                                {review.user?.email?.[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-lg">
                              {review.user?.profile?.full_name ||
                                review.user?.email.split("@")[0]}
                            </p>
                            <p className="text-xs font-bold text-gray-400">
                              {new Date(review.created_at).toLocaleDateString(
                                "vi-VN",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 bg-gray-50 px-3 py-1.5 rounded-lg border border-black/10">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < review.rating
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "fill-gray-200 text-gray-200"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 font-medium leading-relaxed">
                        {review.comment}
                      </p>

                      {review.images &&
                        JSON.parse(review.images).length > 0 && (
                          <div className="flex gap-4 mt-6">
                            {JSON.parse(review.images).map(
                              (imgUrl: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="w-24 h-24 rounded-xl border border-black/20 overflow-hidden cursor-pointer hover:border-primary"
                                >
                                  <img
                                    src={
                                      imgUrl.startsWith("http")
                                        ? imgUrl
                                        : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${imgUrl}`
                                    }
                                    alt="Review img"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ),
                            )}
                          </div>
                        )}
                        
                      {review.vendor_reply && (
                        <div className="mt-6 bg-gray-50 border-l-4 border-primary p-4 rounded-r-xl">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                            Phản hồi từ Người bán
                          </p>
                          <p className="text-sm font-medium text-gray-700">
                            {review.vendor_reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-300">
                    <p className="font-bold text-gray-400">
                      Chưa có đánh giá nào cho sản phẩm này.
                    </p>
                  </div>
                )}
              </div>

              {/* Phân trang Reviews */}
              {reviewsData && reviewsData.totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-8">
                  {[...Array(reviewsData.totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setReviewPage(i + 1)}
                      className={`w-10 h-10 rounded-xl font-black text-sm border-2 flex items-center justify-center transition-all ${reviewPage === i + 1 ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-black"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "returns" && (
          <div className="bg-white border-2 border-black rounded-[3rem] p-12 md:p-20 shadow-brutal relative overflow-hidden">
            <div className="max-w-2xl relative z-10 space-y-8">
              <h3 className="text-4xl font-serif font-black uppercase tracking-tighter">
                Chính sách đổi trả
              </h3>
              <p className="text-gray-500 leading-relaxed font-bold text-lg">
                Chúng tôi luôn đặt lợi ích của khách hàng lên hàng đầu với chính
                sách bảo hành và đổi trả linh hoạt:
              </p>
              <ul className="space-y-6">
                {[
                  "Đổi trả miễn phí trong vòng 15 ngày kể từ ngày nhận hàng với bất kỳ lý do gì",
                  "Sản phẩm đổi trả phải còn nguyên nhãn mác, chưa qua sử dụng hoặc giặt tẩy",
                  "Hỗ trợ phí vận chuyển 2 chiều đối với lỗi kỹ thuật từ nhà sản xuất",
                  "Hoàn tiền 100% qua tài khoản ngân hàng sau khi kiểm duyệt sản phẩm thành công",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-4 text-base font-black"
                  >
                    <div className="w-3.5 h-3.5 bg-primary border-2 border-black rotate-45 mt-1.5 shadow-subtle shrink-0"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-primary/5 -skew-x-12 translate-x-20 pointer-events-none"></div>
          </div>
        )}
      </section>

      {/* Related Products */}
      {similarProducts && similarProducts.length > 0 && (
        <section className="relative">
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="badge-brutal p-2 bg-primary text-white border-black mb-4 inline-block rounded-lg">
                CÓ THỂ BẠN THÍCH
              </span>
              <h2 className="text-5xl font-serif font-black tracking-tighter uppercase">
                SẢN PHẨM TƯƠNG TỰ
              </h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex gap-3">
                <button className="w-14 h-14 rounded-2xl border-2 border-black flex items-center justify-center bg-white shadow-subtle hover:bg-primary hover:text-white transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
                  <ChevronLeft size={24} />
                </button>
                <button className="w-14 h-14 rounded-2xl border-2 border-black flex items-center justify-center bg-white shadow-subtle hover:bg-primary hover:text-white transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {similarProducts.map((p: any) => (
              <ProductCard
                key={p.id}
                id={p.slug}
                name={p.name}
                price={p.sale_price || p.price}
                originalPrice={p.sale_price ? p.price : undefined}
                image={p.images?.[0]?.image_url || "/placeholder.jpg"}
                category={p.category?.name || "Danh mục"}
                rating={5}
                sales={p.sold_count}
                badge={p.is_new ? "Mới" : p.sold_count > 15 ? "Hot" : undefined}
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
