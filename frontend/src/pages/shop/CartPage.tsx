import {
  Trash2,
  Plus,
  Minus,
  Ticket,
  ArrowRight,
  ShoppingBag,
  Loader2,
  ChevronDown,
  Store,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/useCart";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/app/stores/hooks";
import { Check } from "lucide-react";

const CartPage = () => {
  const { data: cart, isLoading } = useCart();
  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();
  const [editingItem, setEditingItem] = useState<{
    id: number;
    color: string;
    size: string;
  } | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);

  const cartItems = cart?.items || [];
  const subtotal = cart?.totalAmount || 0;

  const groupedCartItems = cartItems.reduce((acc: any, item: any) => {
    const shop = item.variant?.product?.shop || item.product?.shop;
    const shopId = shop?.id || "unknown";
    if (!acc[shopId]) {
      acc[shopId] = {
        shop: shop,
        items: [],
      };
    }
    acc[shopId].items.push(item);
    return acc;
  }, {});

  const shopGroups: any[] = Object.values(groupedCartItems);
  
  const selectedCartItems = useMemo(() => {
    return cartItems.filter(item => selectedItems.includes(item.id));
  }, [cartItems, selectedItems]);

  const selectedSubtotal = useMemo(() => {
    return selectedCartItems.reduce((acc, item) => {
      const price = item.variant?.sale_price || item.variant?.price || item.product?.sale_price || item.product?.price || 0;
      return acc + (Number(price) * item.quantity);
    }, 0);
  }, [selectedCartItems]);

  // Shipping logic: Count number of distinct shops among selected items
  const selectedShopIds = new Set(selectedCartItems.map(item => item.variant?.product?.shop?.id || item.product?.shop?.id || 'unknown'));
  const shipping = selectedShopIds.size * 30000;
  const total = selectedSubtotal + shipping;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(cartItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectShop = (shopId: any, itemsInShop: any[], checked: boolean) => {
    if (checked) {
      const newSelected = new Set([...selectedItems, ...itemsInShop.map(i => i.id)]);
      setSelectedItems(Array.from(newSelected));
    } else {
      const shopItemIds = new Set(itemsInShop.map(i => i.id));
      setSelectedItems(selectedItems.filter(id => !shopItemIds.has(id)));
    }
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleUpdateQuantity = (
    itemId: number,
    currentQty: number,
    change: number,
  ) => {
    const newQty = currentQty + change;
    if (newQty < 1) return;
    updateItemMutation.mutate({ itemId, payload: { quantity: newQty } });
  };

  const handleRemove = (itemId: number) => {
    if (window.confirm("Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?")) {
      removeItemMutation.mutate(itemId, {
        onSuccess: () => {
          toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || err.message || "Không thể xóa sản phẩm");
        }
      });
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (selectedItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán");
      return;
    }
    
    if (isAuthenticated) {
      navigate("/checkout", { state: { selectedItems: selectedCartItems } });
    } else {
      navigate("/auth/login?redirect=/checkout", { state: { selectedItems: selectedCartItems } });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-5xl font-serif font-black tracking-tighter uppercase">
                Giỏ hàng
              </h1>
            </div>
            <p className="text-gray-500 font-medium flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                    cartItems.length > 0 && selectedItems.length === cartItems.length
                      ? "bg-primary border-primary text-white" 
                      : "bg-white border-gray-300 text-transparent hover:border-primary"
                  }`}
                >
                  <Check size={14} strokeWidth={4} />
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={cartItems.length > 0 && selectedItems.length === cartItems.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span className="font-bold text-sm uppercase tracking-widest group-hover:text-black transition-colors">
                  Chọn tất cả ({cartItems.length})
                </span>
              </label>
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-primary hover:border-primary transition-all"
          >
            Tiếp tục mua sắm
          </Link>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Main Content - Left Column (7/10) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-6">
              {shopGroups.map((group) => (
                <div
                  key={group.shop?.id || "unknown"}
                  className="bg-white border-2 border-black rounded-[2.5rem] p-8 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 border-b-2 border-black pb-4 mb-6">
                    <label className="cursor-pointer group select-none flex items-center justify-center">
                      <div 
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                          group.items.length > 0 && group.items.every((i: any) => selectedItems.includes(i.id))
                            ? "bg-primary border-primary text-white" 
                            : "bg-white border-gray-300 text-transparent hover:border-primary"
                        }`}
                      >
                        <Check size={14} strokeWidth={4} />
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={group.items.length > 0 && group.items.every((i: any) => selectedItems.includes(i.id))}
                        onChange={(e) => handleSelectShop(group.shop?.id || "unknown", group.items, e.target.checked)}
                      />
                    </label>
                    <Store className="text-primary" />
                    <h2 className="text-xl font-black uppercase tracking-tighter">
                      {group.shop?.shop_name || "UTEShop Official"}
                    </h2>
                  </div>
                  <div className="space-y-8">
                    {group.items.map((item: any) => {
                      const variant = item.variant;
                      const product = variant?.product || item.product;
                      const imageUrl =
                        product?.images?.find((img: any) => img.is_primary)
                          ?.image_url ||
                        product?.images?.[0]?.image_url ||
                        "";
                      const currentPrice = Number(
                        variant?.sale_price || variant?.price || 0,
                      );
                      const originalPrice = Number(variant?.price || 0);

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 py-6 first:pt-0 last:pb-0 border-b border-gray-100 last:border-0 group"
                        >
                          {/* Checkbox */}
                          <label className="cursor-pointer group select-none flex items-center justify-center flex-shrink-0">
                            <div 
                              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                                selectedItems.includes(item.id)
                                  ? "bg-primary border-primary text-white" 
                                  : "bg-white border-gray-300 text-transparent hover:border-primary"
                              }`}
                            >
                              <Check size={14} strokeWidth={4} />
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={selectedItems.includes(item.id)}
                              onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                            />
                          </label>

                          {/* Thumbnail */}
                          <div className="w-32 h-40 bg-gray-50 rounded-2xl overflow-hidden border-2 border-black flex-shrink-0 relative group-hover:shadow-subtle transition-all">
                            <img
                              src={
                                imageUrl.startsWith("http")
                                  ? imageUrl
                                  : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${imageUrl}`
                              }
                              alt={product?.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Details */}
                          <div className="flex-grow space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-xl font-black tracking-tight uppercase group-hover:text-primary transition-colors">
                                  <Link to={`/products/${product?.slug}`}>
                                    {product?.name}
                                  </Link>
                                </h3>
                                {variant && (
                                  <div className="mt-2">
                                    {editingItem?.id === item.id ? (
                                      <div className="bg-gray-50 border-2 border-black rounded-xl p-4 mt-2">
                                        <div className="flex flex-col gap-3">
                                          <div className="flex gap-2 items-center">
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 w-12">
                                              Màu:
                                            </span>
                                            {Array.from(
                                              new Set(
                                                product?.variants
                                                  ?.map((v: any) => v.color)
                                                  .filter(Boolean),
                                              ),
                                            ).map((color: any) => (
                                              <button
                                                key={color}
                                                onClick={() =>
                                                  setEditingItem(
                                                    editingItem
                                                      ? {
                                                        ...editingItem,
                                                        color,
                                                      }
                                                      : null,
                                                  )
                                                }
                                                className={`px-3 py-1 rounded-lg border-2 text-xs font-bold transition-all ${editingItem?.color === color ? "border-black bg-black text-white" : "border-gray-200 bg-white hover:border-black"}`}
                                              >
                                                {color}
                                              </button>
                                            ))}
                                          </div>
                                          <div className="flex gap-2 items-center">
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 w-12">
                                              Size:
                                            </span>
                                            {Array.from(
                                              new Set(
                                                product?.variants
                                                  ?.map((v: any) => v.size)
                                                  .filter(Boolean),
                                              ),
                                            ).map((size: any) => (
                                              <button
                                                key={size}
                                                onClick={() =>
                                                  setEditingItem(
                                                    editingItem
                                                      ? { ...editingItem, size }
                                                      : null,
                                                  )
                                                }
                                                className={`px-3 py-1 rounded-lg border-2 text-xs font-bold transition-all ${editingItem?.size === size ? "border-black bg-black text-white" : "border-gray-200 bg-white hover:border-black"}`}
                                              >
                                                {size}
                                              </button>
                                            ))}
                                          </div>
                                          <div className="flex gap-2 mt-2">
                                            <button
                                              onClick={() => {
                                                const matchedVariant =
                                                  product?.variants?.find(
                                                    (v: any) =>
                                                      v.color ===
                                                      editingItem?.color &&
                                                      v.size ===
                                                      editingItem?.size,
                                                  );
                                                if (
                                                  matchedVariant &&
                                                  matchedVariant.id !==
                                                  variant.id
                                                ) {
                                                  updateItemMutation.mutate({
                                                    itemId: item.id,
                                                    payload: {
                                                      newVariantId:
                                                        matchedVariant.id,
                                                      product_variant_id:
                                                        matchedVariant.id,
                                                    },
                                                  });
                                                }
                                                setEditingItem(null);
                                              }}
                                              className="bg-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary"
                                            >
                                              Xác nhận
                                            </button>
                                            <button
                                              onClick={() =>
                                                setEditingItem(null)
                                              }
                                              className="bg-white border-2 border-black text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"
                                            >
                                              Hủy
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setEditingItem({
                                            id: item.id,
                                            color: variant.color || "",
                                            size: variant.size || "",
                                          })
                                        }
                                        className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-black transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200"
                                      >
                                        Phân loại:{" "}
                                        <span className="text-black ml-1">
                                          {variant.size} / {variant.color}
                                        </span>{" "}
                                        <ChevronDown size={14} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemove(item.id)}
                                disabled={removeItemMutation.isPending}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all h-fit"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-6">
                              {/* Quantity Selector */}
                              <div className="flex items-center bg-gray-50 border-2 border-black rounded-xl h-12 overflow-hidden">
                                <button
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.id,
                                      item.quantity,
                                      -1,
                                    )
                                  }
                                  disabled={updateItemMutation.isPending}
                                  className="w-12 h-full flex items-center justify-center hover:bg-white transition-all font-bold text-lg border-r-2 border-black disabled:opacity-50"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="w-14 text-center font-black text-base">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.id,
                                      item.quantity,
                                      1,
                                    )
                                  }
                                  disabled={updateItemMutation.isPending}
                                  className="w-12 h-full flex items-center justify-center hover:bg-white transition-all font-bold text-lg border-l-2 border-black disabled:opacity-50"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>

                              {/* Price */}
                              <div className="text-right">
                                {variant?.sale_price && (
                                  <p className="text-sm font-bold text-gray-400 line-through">
                                    {originalPrice.toLocaleString()}₫
                                  </p>
                                )}
                                <p className="text-xl font-black text-black">
                                  {currentPrice.toLocaleString()}₫
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty Cart Placeholder (hidden if items exist) */}
            {cartItems.length === 0 && (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-[2.5rem] p-20 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400">
                  <ShoppingBag size={40} />
                </div>
                <h2 className="text-2xl font-black uppercase mb-2">
                  Giỏ hàng trống
                </h2>
                <p className="text-gray-500 mb-8 max-w-xs">
                  Hãy chọn cho mình những sản phẩm ưng ý nhất để làm đầy giỏ
                  hàng nhé!
                </p>
                <Link to="/products" className="btn-brutal px-10">
                  Khám phá ngay
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar - Right Column (3/10) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Order Summary */}
            <div className="bg-white border-2 border-black rounded-[2.5rem] p-8 shadow-brutal flex flex-col gap-6">
              <h3 className="text-xl font-black uppercase tracking-tighter border-b-2 border-black pb-4">
                Tổng quan đơn hàng
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">
                    Tạm tính
                  </span>
                  <span className="font-black">
                    {selectedSubtotal.toLocaleString()}₫
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">
                    Phí giao hàng
                  </span>
                  <div className="text-right">
                    <span className="font-black text-black">
                      {shipping > 0 ? `${shipping.toLocaleString()}₫` : "0₫"}
                    </span>
                    <p className="text-[10px] text-gray-400 font-bold">
                      ({selectedShopIds.size} kiện hàng)
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">
                    Tổng cộng
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-primary font-black mb-1 italic">
                      Đã bao gồm VAT
                    </p>
                    <p className="text-3xl font-black tracking-tighter">
                      {total.toLocaleString()}₫
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
                className="w-full bg-primary border-2 border-black text-white mt-4 py-5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all duration-200 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"

              >
                THANH TOÁN NGAY <ArrowRight size={16} />
              </button>

              <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Thanh toán an toàn 100% với bảo mật SSL <br />
                Đổi trả dễ dàng trong vòng 30 ngày
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
