import { Star, Plus, Minus, X, ShoppingCart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/shared/utils/format";
import { useState, useEffect } from "react";
import { useProductDetail } from "@/hooks/useProducts";
import { useAddToCart } from "@/hooks/useCart";
import { createPortal } from "react-dom";
import { useLanguage } from "@/shared/context/LanguageContext";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
  sales: number;
  badge?: string;
  isFlashSale?: boolean;
  shop?: {
    id: number | string;
    name: string;
    avatar_url?: string | null;
    followers_count?: number;
  };
}

const ProductCard = ({
  id,
  name,
  price,
  originalPrice,
  image,
  category,
  rating,
  sales,
  badge,
  isFlashSale,
  shop,
}: ProductCardProps) => {
  const [showModal, setShowModal] = useState(false);
  const { t } = useLanguage();

  const finalImage = image.startsWith('http') || image.startsWith('data:') || image.startsWith('/placeholder') 
    ? image 
    : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${image.startsWith('/') ? '' : '/'}${image}`;

  // Calculate discount percentage
  const discountPercent = originalPrice && originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : null;

  return (
    <>
      <div className="group relative flex flex-col bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#ee4d2d]/40">
        {/* Image Container - Shopee 1:1 Aspect Ratio */}
        <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-slate-900">
          <Link to={`/products/${id}`} className="block w-full h-full">
            <img
              src={finalImage}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </Link>

          {/* Top-Left Discount Badge */}
          {discountPercent && discountPercent > 0 && (
            <div className="absolute top-0 left-0 bg-[#fef0ed] text-[#ee4d2d] px-1.5 py-0.5 text-[11px] font-black rounded-br-md shadow-xs border-r border-b border-[#ee4d2d]/20">
              -{discountPercent}%
            </div>
          )}

          {/* Top-Right Flash Sale / Badge */}
          {(isFlashSale || badge === "Sale") && (
            <div className="absolute top-1.5 right-1.5 bg-[#ee4d2d] text-white px-1.5 py-0.5 text-[10px] font-bold rounded-xs uppercase tracking-wider shadow-xs">
              FLASH SALE
            </div>
          )}

          {badge && badge !== "Sale" && !isFlashSale && (
            <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 text-[10px] font-semibold rounded-xs">
              {badge}
            </div>
          )}

          {/* Quick Add Button - Floating Shopee Style */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowModal(true);
            }}
            title="Thêm nhanh vào giỏ"
            className="absolute bottom-2 right-2 w-8 h-8 bg-white dark:bg-slate-700 text-[#ee4d2d] rounded-full flex items-center justify-center opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 shadow-md hover:bg-[#ee4d2d] hover:text-white cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Info Container */}
        <div className="p-3 flex flex-col flex-1 justify-between space-y-1.5">
          {/* Shop name if present */}
          {shop && (
            <Link 
              to={`/shop/${shop.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-gray-500 dark:text-slate-400 hover:text-[#ee4d2d] transition-colors truncate font-medium"
            >
              {shop.name}
            </Link>
          )}

          {/* Product Name (2 Lines Max) */}
          <Link 
            to={`/products/${id}`} 
            className="text-xs sm:text-[13px] font-normal text-gray-800 dark:text-slate-100 line-clamp-2 hover:text-[#ee4d2d] transition-colors leading-snug min-h-[34px]"
            title={name}
          >
            {name}
          </Link>

          {/* Price Row */}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-sm sm:text-base font-bold text-[#ee4d2d]">
              {formatPrice(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[11px] text-gray-400 dark:text-slate-500 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Rating & Sold count */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-0.5">
            <div className="flex items-center gap-1">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="font-semibold text-gray-700 dark:text-slate-200">
                {rating > 0 ? rating.toFixed(1) : "5.0"}
              </span>
            </div>
            <span>
              {t("sold")} {sales > 1000 ? `${(sales / 1000).toFixed(1)}k` : sales}
            </span>
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {showModal && (
        <AddToCartModal
          productSlug={id}
          productName={name}
          productImage={image}
          productPrice={price}
          originalPrice={originalPrice}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

// ==================== ADD TO CART MODAL ====================
interface AddToCartModalProps {
  productSlug: string;
  productName: string;
  productImage: string;
  productPrice: number;
  originalPrice?: number;
  onClose: () => void;
}

const AddToCartModal = ({
  productSlug,
  productName,
  productImage,
  productPrice,
  originalPrice,
  onClose,
}: AddToCartModalProps) => {
  const { data: product, isLoading } = useProductDetail(productSlug);
  const addToCartMutation = useAddToCart();
  const { t } = useLanguage();

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-select first variant when product loads
  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      if (firstVariant.color) setSelectedColor(firstVariant.color);
      if (firstVariant.size) setSelectedSize(firstVariant.size);
    }
  }, [product]);

  // Compute variant data
  const colorsData = product?.variants
    ? Array.from(
        new Map(
          product.variants.map((v) => [v.color, v.color_hex || "#888888"]),
        ).entries(),
      ).map(([name, hex]) => ({ name, hex }))
    : [];

  const sizes = Array.from(
    new Set(product?.variants?.map((v) => v.size).filter(Boolean)),
  );

  const activeVariant = product?.variants?.find(
    (v) => v.color === selectedColor && v.size === selectedSize,
  );

  const displayPrice = activeVariant
    ? (activeVariant.sale_price ? Number(activeVariant.sale_price) : Number(activeVariant.price))
    : (product?.sale_price ? Number(product.sale_price) : Number(product?.price || productPrice));

  const variantWithImage = product?.variants?.find(
    (v: any) => v.color === selectedColor && v.image_url
  );
  
  const currentImage = variantWithImage?.image_url || productImage || "";

  const finalProductImage = !currentImage
    ? "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400"
    : (currentImage.startsWith('http') || currentImage.startsWith('data:') || currentImage.startsWith('/placeholder') 
      ? currentImage 
      : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${currentImage.startsWith('/') ? '' : '/'}${currentImage}`);

  const currentStock = activeVariant
    ? activeVariant.stock_quantity
    : product?.totalStock || product?.stock_quantity || 0;

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    if (newQty > currentStock) return;
    setQuantity(newQty);
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (product.variants && product.variants.length > 0 && !activeVariant) {
      setMessage({ type: "error", text: "Vui lòng chọn đầy đủ biến thể sản phẩm" });
      return;
    }

    addToCartMutation.mutate(
      {
        product_id: product.id,
        variant_id: activeVariant ? activeVariant.id : undefined,
        quantity: quantity,
      },
      {
        onSuccess: () => {
          setMessage({ type: "success", text: "Đã thêm vào giỏ hàng thành công!" });
          setTimeout(() => {
            onClose();
          }, 800);
        },
        onError: (err: any) => {
          setMessage({
            type: "error",
            text: err?.response?.data?.message || "Thêm vào giỏ hàng thất bại",
          });
        },
      }
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
            {t("add_to_cart")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-[#ee4d2d]" />
            </div>
          ) : (
            <>
              {/* Product Info */}
              <div className="flex gap-3">
                <img
                  src={finalProductImage}
                  alt={productName}
                  className="w-18 h-18 object-cover rounded-lg border border-gray-200 dark:border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100 line-clamp-2">
                    {productName}
                  </h4>
                  <div className="mt-1">
                    <span className="text-base font-bold text-[#ee4d2d]">
                      {formatPrice(displayPrice)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Kho: <span className="font-semibold text-gray-700 dark:text-slate-200">{currentStock}</span>
                  </p>
                </div>
              </div>

              {/* Color Selection */}
              {colorsData.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Màu sắc:
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {colorsData.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c.name)}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-all cursor-pointer ${
                          selectedColor === c.name
                            ? "border-[#ee4d2d] bg-[#fef0ed] text-[#ee4d2d] font-bold"
                            : "border-gray-200 dark:border-slate-700 hover:border-gray-300 text-gray-700 dark:text-slate-300"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {sizes.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Kích thước:
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-all cursor-pointer ${
                          selectedSize === s
                            ? "border-[#ee4d2d] bg-[#fef0ed] text-[#ee4d2d] font-bold"
                            : "border-gray-200 dark:border-slate-700 hover:border-gray-300 text-gray-700 dark:text-slate-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h5 className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t("quantity")}:
                </h5>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-xs font-semibold text-gray-800 dark:text-slate-200">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= currentStock}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Alert */}
              {message && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium ${
                    message.type === "success"
                      ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                      : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={handleAddToCart}
            disabled={currentStock === 0 || addToCartMutation.isPending || isLoading}
            className="w-full bg-[#ee4d2d] hover:bg-[#d03e1e] text-white py-2.5 rounded-md font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {addToCartMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShoppingCart size={16} />
            )}
            <span>{t("add_to_cart")}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductCard;
