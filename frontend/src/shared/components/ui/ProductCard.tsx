import { Star, Plus, Minus, X, ShoppingCart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/shared/utils/format";
import { useState, useEffect } from "react";
import { useProductDetail } from "@/hooks/useProducts";
import { useAddToCart } from "@/hooks/useCart";
import { createPortal } from "react-dom";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
  sales: number;
  badge?: "Mới" | "Hot" | "Sale" | "Nổi bật";
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
  shop,
}: ProductCardProps) => {
  const [showModal, setShowModal] = useState(false);

  const finalImage = image.startsWith('http') || image.startsWith('data:') || image.startsWith('/placeholder') 
    ? image 
    : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${image.startsWith('/') ? '' : '/'}${image}`;

  return (
    <>
      <div className="group relative flex flex-col bg-white border-2 border-slate-100 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-800 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 border-b border-gray-100">
          <Link to={`/products/${id}`}>
            <img
              src={finalImage}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </Link>

          {/* Badges */}
          {badge && (
            <div className="absolute top-4 left-4">
              <span className={`badge-modern ${
                badge === "Hot" ? "bg-red-50 text-red-600 border-red-200" : badge === "Sale" ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-white text-gray-700 border-gray-200"
              }`}>
                {badge}
              </span>
            </div>
          )}

          {/* Quick Add Button - Opens Modal */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowModal(true);
            }}
            className="absolute bottom-4 right-4 w-11 h-11 bg-white/90 backdrop-blur-sm text-gray-700 border-2 border-slate-200 rounded-xl flex items-center justify-center opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-primary hover:text-white hover:border-slate-800 shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-0 active:shadow-none"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Info Container */}
        <div className="p-5 flex flex-col space-y-2">
          {shop && (
            <Link 
              to={`/shop/${shop.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 pb-2 border-b border-gray-100 hover:opacity-80 transition-opacity"
            >
              <img 
                src={shop.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100"} 
                alt={shop.name} 
                className="w-6 h-6 rounded-full border border-gray-200 object-cover shrink-0 shadow-sm"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-black leading-tight truncate">{shop.name}</span>
                <span className="text-[8px] font-bold text-gray-400 leading-none mt-0.5">{shop.followers_count !== undefined ? `${(shop.followers_count / 1000).toFixed(1)}k` : '0'} followers</span>
              </div>
            </Link>
          )}

          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
            {category}
          </p>
          
          <Link to={`/products/${id}`} className="text-sm font-bold text-black line-clamp-1 hover:text-primary transition-colors">
            {name}
          </Link>

          {/* Rating & Sales */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}
                />
              ))}
            </div>
            <span className="text-[11px] text-gray-400 font-bold border-l border-gray-200 pl-3">
              Đã bán {sales > 1000 ? `${(sales / 1000).toFixed(1)}k` : sales}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-base font-black text-primary">
              {formatPrice(price)}
            </span>
            {originalPrice && (
              <span className="text-xs text-gray-300 line-through decoration-black/10">
                {formatPrice(originalPrice)}
              </span>
            )}
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

  // Tính toán giá hiển thị và giá gốc linh hoạt theo biến thể
  const basePrice = activeVariant?.price
    ? Number(activeVariant.price)
    : product?.price || productPrice;

  const displayPrice = activeVariant
    ? (activeVariant.sale_price ? Number(activeVariant.sale_price) : Number(activeVariant.price))
    : (product?.sale_price ? Number(product.sale_price) : Number(product?.price || productPrice));

  const isSale = activeVariant
    ? !!activeVariant.sale_price
    : !!product?.sale_price;

  const originalPriceVal = isSale
    ? (activeVariant ? Number(activeVariant.price) : Number(product?.price || originalPrice))
    : undefined;

  // Tính toán ảnh hiển thị linh hoạt theo màu sắc biến thể được chọn
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

  const hasVariants = colorsData.length > 0 || sizes.length > 0;

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    if (newQty > currentStock) return;
    setQuantity(newQty);
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCartMutation.mutate(
      {
        productId: product.id,
        variantId: activeVariant?.id,
        quantity,
        product: product,
        variant: activeVariant
      },
      {
        onSuccess: () => {
          window.dispatchEvent(new CustomEvent("cart-item-added"));
          setMessage({ type: "success", text: "Đã thêm vào giỏ hàng!" });
          setTimeout(() => {
            onClose();
          }, 1000);
        },
        onError: (err: any) => {
          setMessage({ type: "error", text: err?.response?.data?.message || "Thêm vào giỏ hàng thất bại!" });
          setTimeout(() => setMessage(null), 3000);
        },
      }
    );
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" />

      {/* Modal Content */}
      <div
        className="relative bg-white border border-white/20 rounded-[2rem] shadow-premium w-full max-w-lg overflow-hidden animate-[slideUp_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 w-10 h-10 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all active:scale-95 text-gray-500"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Product Info Header */}
        <div className="flex gap-5 p-6 pb-0">
          <div className="w-24 h-28 rounded-2xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
            <img
              src={finalProductImage}
              alt={productName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center min-w-0 pr-10">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
              THÊM VÀO GIỎ HÀNG
            </p>
            <h3 className="text-lg font-serif font-black uppercase tracking-tight leading-tight line-clamp-2">
              {productName}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-lg font-black text-primary">
                {formatPrice(displayPrice)}
              </span>
              {originalPriceVal && (
                <span className="text-xs text-gray-300 line-through">
                  {formatPrice(originalPriceVal)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 mt-5 border-t border-gray-100" />

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                Đang tải thông tin...
              </p>
            </div>
          ) : (
            <>
              {/* Color Selection */}
              {colorsData.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-black mb-4">
                    MÀU SẮC:{" "}
                    <span className="text-gray-400 ml-1 font-bold">
                      {selectedColor}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {colorsData.map((colorObj) => {
                      if (!colorObj.name) return null;
                      const isSelected = colorObj.name === selectedColor;
                      return (
                        <button
                          key={colorObj.name}
                          onClick={() => {
                            setSelectedColor(colorObj.name);
                            setQuantity(1);
                          }}
                          className={
                            "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center " +
                            (isSelected
                              ? "border-primary p-1 scale-110 shadow-sm"
                              : "border-transparent hover:border-gray-200")
                          }
                          title={colorObj.name}
                        >
                          <div
                            className="w-full h-full rounded-full border border-gray-200"
                            style={{ backgroundColor: colorObj.hex }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {sizes.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-black mb-4">
                    KÍCH THƯỚC:
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {sizes.map((size) => {
                      if (!size) return null;
                      const isSelected = size === selectedSize;
                      return (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size);
                            setQuantity(1);
                          }}
                          className={
                            "h-11 px-5 rounded-xl font-bold text-sm transition-all border active:scale-95 " +
                            (isSelected
                              ? "bg-primary text-white border-primary shadow-md"
                              : "bg-white text-gray-700 border-gray-200 hover:border-primary/50")
                          }
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-black mb-4">
                  SỐ LƯỢNG:
                </h4>
                <div className="flex items-center gap-5">
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl h-11 overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={currentStock === 0}
                      className="w-11 h-full flex items-center justify-center hover:bg-gray-50 transition-all border-r border-gray-200 disabled:opacity-50 text-gray-600"
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span className="w-12 text-center font-bold text-sm text-gray-800">
                      {currentStock === 0 ? 0 : quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={currentStock === 0}
                      className="w-11 h-full flex items-center justify-center hover:bg-gray-50 transition-all border-l border-gray-200 disabled:opacity-50 text-gray-600"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  {currentStock > 0 ? (
                    <span className="text-[10px] font-black text-green-600 uppercase flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                      Còn hàng ({currentStock})
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Hết hàng
                    </span>
                  )}
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`p-3 rounded-xl border text-xs font-bold uppercase tracking-widest text-center shadow-sm ${message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"}`}>
                  {message.text}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Add to Cart Button */}
        <div className="p-6 pt-0">
          <button
            disabled={currentStock === 0 || addToCartMutation.isPending || isLoading}
            onClick={handleAddToCart}
            className="btn-modern w-full h-14 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ShoppingCart size={18} />
            {addToCartMutation.isPending ? "Đang thêm..." : "Thêm vào giỏ hàng"}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ProductCard;
