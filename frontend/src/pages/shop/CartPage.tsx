import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Store,
  Truck,
  Check,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/useCart";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/app/stores/hooks";
import { formatPrice } from "@/shared/utils/format";
import { useLanguage } from "@/shared/context/LanguageContext";

const CartPage = () => {
  const { data: cart, isLoading } = useCart();
  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const { t } = useLanguage();

  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => !!state.auth.accessToken);

  const cartItems = cart?.items || [];

  const groupedCartItems = cartItems.reduce((acc: any, item: any) => {
    const shop = item.variant?.product?.shop || item.product?.shop;
    const shopId = shop?.id || "default";
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
    return cartItems.filter((item) => selectedItems.includes(item.id));
  }, [cartItems, selectedItems]);

  const selectedSubtotal = useMemo(() => {
    return selectedCartItems.reduce((acc, item) => {
      const price =
        item.variant?.sale_price ||
        item.variant?.price ||
        item.product?.sale_price ||
        item.product?.price ||
        0;
      return acc + Number(price) * item.quantity;
    }, 0);
  }, [selectedCartItems]);

  const selectedShopIds = new Set(
    selectedCartItems.map(
      (item) => item.variant?.product?.shop?.id || item.product?.shop?.id || "default"
    )
  );
  const shipping = selectedShopIds.size > 0 ? selectedShopIds.size * 25000 : 0;
  const total = selectedSubtotal;

  const isAllSelected =
    cartItems.length > 0 && cartItems.every((i) => selectedItems.includes(i.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(cartItems.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectShop = (itemsInShop: any[], checked: boolean) => {
    if (checked) {
      const newSelected = new Set([...selectedItems, ...itemsInShop.map((i) => i.id)]);
      setSelectedItems(Array.from(newSelected));
    } else {
      const shopItemIds = new Set(itemsInShop.map((i) => i.id));
      setSelectedItems(selectedItems.filter((id) => !shopItemIds.has(id)));
    }
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleUpdateQuantity = (
    itemId: number,
    currentQty: number,
    change: number
  ) => {
    const newQty = currentQty + change;
    if (newQty < 1) return;
    updateItemMutation.mutate({ itemId, payload: { quantity: newQty } });
  };

  const handleRemoveItem = (itemId: number) => {
    if (window.confirm("Bạn có chắc chắn muốn bỏ sản phẩm này?")) {
      removeItemMutation.mutate(itemId, {
        onSuccess: () => {
          setSelectedItems((prev) => prev.filter((id) => id !== itemId));
        },
      });
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để tiến hành thanh toán");
      navigate("/auth/login?redirect=/checkout");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm để thanh toán");
      return;
    }
    localStorage.setItem("checkout_items", JSON.stringify(selectedItems));
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 py-6 pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Freeship Alert Bar Shopee Style */}
        <div className="bg-[#fef0ed] dark:bg-rose-950/30 border border-[#ee4d2d]/20 text-[#ee4d2d] rounded-lg p-3 text-xs flex items-center gap-2 mb-4">
          <Truck size={18} className="shrink-0" />
          <span>
            Nhấn vào mục Mã giảm giá ở cuối trang để hưởng Miễn Phí Vận Chuyển từ MeeMart!
          </span>
        </div>

        {/* Table Column Header (Shopee Style) */}
        <div className="hidden md:grid grid-cols-12 gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-100 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-slate-400 mb-3 shadow-xs">
          <div className="col-span-5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 text-[#ee4d2d] rounded-xs cursor-pointer"
            />
            <span>{t("select_all")} ({cartItems.length} sản phẩm)</span>
          </div>
          <div className="col-span-2 text-center">{t("unit_price")}</div>
          <div className="col-span-2 text-center">{t("quantity")}</div>
          <div className="col-span-2 text-center">{t("total_price")}</div>
          <div className="col-span-1 text-center">{t("action")}</div>
        </div>

        {/* Cart Item Groups by Shop */}
        {cartItems.length > 0 ? (
          <div className="space-y-4">
            {shopGroups.map((group: any, idx: number) => {
              const shop = group.shop;
              const isShopSelected =
                group.items.length > 0 &&
                group.items.every((i: any) => selectedItems.includes(i.id));

              return (
                <div
                  key={shop?.id || idx}
                  className="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 shadow-xs overflow-hidden"
                >
                  {/* Shop Header */}
                  <div className="p-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2.5 bg-gray-50/50 dark:bg-slate-800/40">
                    <input
                      type="checkbox"
                      checked={isShopSelected}
                      onChange={(e) =>
                        handleSelectShop(group.items, e.target.checked)
                      }
                      className="w-4 h-4 text-[#ee4d2d] rounded-xs cursor-pointer"
                    />
                    <Store size={15} className="text-[#ee4d2d]" />
                    <span className="font-bold text-xs text-gray-900 dark:text-slate-100">
                      {shop?.shop_name || "MeeMart Mall"}
                    </span>
                    <span className="bg-[#ee4d2d] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-xs ml-1">
                      MALL
                    </span>
                  </div>

                  {/* Items in Shop */}
                  <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {group.items.map((item: any) => {
                      const variant = item.variant;
                      const product = variant?.product || item.product;
                      const imageUrl =
                        product?.images?.[0]?.image_url ||
                        product?.thumbnail ||
                        "/placeholder.jpg";
                      const currentPrice = Number(
                        variant?.sale_price || variant?.price || product?.sale_price || product?.price || 0
                      );
                      const originalPrice = Number(
                        variant?.price || product?.price || 0
                      );
                      const variantName = [variant?.color, variant?.size]
                        .filter(Boolean)
                        .join(", ");

                      const isSelected = selectedItems.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                        >
                          {/* Product Info */}
                          <div className="col-span-5 flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                handleSelectItem(item.id, e.target.checked)
                              }
                              className="w-4 h-4 text-[#ee4d2d] rounded-xs cursor-pointer shrink-0"
                            />
                            <Link
                              to={`/products/${product?.slug || product?.id}`}
                              className="w-18 h-18 rounded-md overflow-hidden bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shrink-0"
                            >
                              <img
                                src={imageUrl}
                                alt={product?.name}
                                className="w-full h-full object-cover"
                              />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/products/${product?.slug || product?.id}`}
                                className="text-xs font-medium text-gray-800 dark:text-slate-100 hover:text-[#ee4d2d] transition-colors line-clamp-2 leading-snug"
                              >
                                {product?.name}
                              </Link>
                              {variantName && (
                                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                                  Phân loại: {variantName}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div className="col-span-2 text-center text-xs">
                            {originalPrice > currentPrice && (
                              <span className="text-gray-400 line-through mr-1.5 block">
                                {formatPrice(originalPrice)}
                              </span>
                            )}
                            <span className="font-semibold text-gray-900 dark:text-slate-100">
                              {formatPrice(currentPrice)}
                            </span>
                          </div>

                          {/* Quantity Counter */}
                          <div className="col-span-2 flex items-center justify-center">
                            <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden">
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity, -1)
                                }
                                disabled={
                                  item.quantity <= 1 ||
                                  updateItemMutation.isPending
                                }
                                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-9 text-center text-xs font-semibold text-gray-800 dark:text-slate-200">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity, 1)
                                }
                                disabled={updateItemMutation.isPending}
                                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Total Item Price */}
                          <div className="col-span-2 text-center">
                            <span className="text-xs sm:text-sm font-bold text-[#ee4d2d]">
                              {formatPrice(currentPrice * item.quantity)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Cart State */
          <div className="bg-white dark:bg-slate-900 rounded-xl p-16 text-center border border-gray-100 dark:border-slate-800 shadow-xs flex flex-col items-center">
            <ShoppingBag size={56} className="text-gray-300 dark:text-slate-700 mb-3" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-1">
              Giỏ hàng của bạn còn trống
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-6">
              Hãy chọn thêm sản phẩm vào giỏ nhé!
            </p>
            <Link
              to="/products"
              className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs font-semibold px-6 py-2.5 rounded-md transition-colors shadow-xs"
            >
              MUA NGAY
            </Link>
          </div>
        )}

        {/* Sticky Checkout Bottom Bar (Shopee Style) */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-2xl py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left actions */}
              <div className="flex items-center gap-4 text-xs font-medium text-gray-700 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-[#ee4d2d] rounded-xs"
                  />
                  <span>Chọn tất cả ({cartItems.length})</span>
                </label>
                <button
                  onClick={() => {
                    if (selectedItems.length > 0 && window.confirm("Xóa các sản phẩm đã chọn?")) {
                      selectedItems.forEach((id) => removeItemMutation.mutate(id));
                      setSelectedItems([]);
                    }
                  }}
                  disabled={selectedItems.length === 0}
                  className="text-gray-500 hover:text-red-500 disabled:opacity-40 cursor-pointer"
                >
                  Xóa
                </button>
              </div>

              {/* Right total and CTA button */}
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right">
                  <div className="text-xs text-gray-600 dark:text-slate-400">
                    Tổng thanh toán ({selectedItems.length} sản phẩm):{" "}
                    <span className="text-base sm:text-xl font-bold text-[#ee4d2d]">
                      {formatPrice(selectedSubtotal)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">Tiết kiệm nhiều hơn với Voucher sàn</p>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="bg-[#ee4d2d] hover:bg-[#d03e1e] text-white text-xs sm:text-sm font-semibold px-8 py-3 rounded-md transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {t("proceed_to_checkout")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
