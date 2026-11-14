import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  Star,
  ChevronRight,
  Calendar,
  Hash,
  Loader2,
  Store,
  RefreshCcw,
  MapPin,
} from "lucide-react";
import PaymentCountdownButton from "@/shared/components/ui/PaymentCountdownButton";
import { useState, useMemo } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMyOrders,
  useMyOrderCounts,
  useCancelOrder,
  useRetryPayment,
} from "@/hooks/useOrders";
import { useAddToCart } from "@/hooks/useCart";
import { getOrderStatusLabel } from '@/shared/utils/statusUtils';
import { getCurrentLocale } from '@/shared/utils/format';
import { ReturnOrderModal } from "@/shared/components/modals/ReturnOrderModal";
import { useQueryClient } from "@tanstack/react-query";
import orderService from "@/services/orderService";
import { OrderStatus } from "@/shared/types/order.types";
import { useLanguage } from "@/shared/context/LanguageContext";

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every minute to refresh cancel button state
  useState(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  });

  const getStatusQuery = () => {
    switch (activeTab) {
      case "pending":
        return "PENDING";
      case "confirmed":
        return "CONFIRMED";
      case "preparing":
        return "PREPARING";
      case "shipping":
        return "READY_FOR_PICKUP,PICKED_UP,IN_TRANSIT,DELIVERING,SHIPPING,DELIVERED";
      case "completed":
        return "COMPLETED";
      case "cancelled":
        return "CANCELLED";
      case "returns":
        return "RETURN_PENDING,RETURNED";
      default:
        return "all";
    }
  };

  const cancelledSuggestions = [
    t("orders_cancel_reason_address"),
    t("orders_cancel_reason_product"),
    t("orders_cancel_reason_changed_mind"),
    t("orders_cancel_reason_wrong_info"),
    t("orders_cancel_reason_unexpected"),
    t("orders_cancel_reason_price"),
    t("orders_cancel_reason_quality"),
    t("orders_cancel_reason_other"),
  ];

  const { data: orderResponse, isLoading } = useMyOrders(getStatusQuery());
  const { data: counts } = useMyOrderCounts();
  const cancelOrderMutation = useCancelOrder();
  const retryPaymentMutation = useRetryPayment();
  const addToCartMutation = useAddToCart();

  const filteredOrders = useMemo(() => {
    const orders = [...(orderResponse?.orders || [])].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );

    if (!searchTerm.trim()) return orders;

    const normalized = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const code = (order.shop_order_code || order.order_code || "").toLowerCase();
      const items = (order.items || []).some((item: any) => {
        const productName = (item.product_name || item.variant?.product?.name || "").toLowerCase();
        return productName.includes(normalized) || code.includes(normalized);
      });

      return code.includes(normalized) || items;
    });
  }, [orderResponse?.orders, searchTerm]);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [orderToCancel, setOrderToCancel] = useState<{
    id: number;
    status: string;
  } | null>(null);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const handleOpenReturnModal = (order: any) => {
    setSelectedOrderForReturn(order);
    setReturnModalOpen(true);
  };

  const handleConfirmReceipt = async (orderId: number) => {
    if (!window.confirm(t("orders_confirm_receipt"))) return;
    setIsConfirming(orderId);
    try {
      await orderService.updateOrderStatus(orderId, 'COMPLETED');
      alert(t("orders_receipt_success"));
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderCounts"] });
    } catch (error: any) {
      alert(`${t("error_label")}: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsConfirming(null);
    }
  };

  const handleOpenCancelModal = (id: number, status: string) => {
    setOrderToCancel({ id, status });
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const submitCancelOrder = () => {
    if (!orderToCancel) return;
    if (!cancelReason.trim()) {
      alert(t("orders_cancel_reason_required"));
      return;
    }
    cancelOrderMutation.mutate(
      { id: orderToCancel.id, reason: cancelReason },
      {
        onSuccess: () => {
          setCancelModalOpen(false);
          setOrderToCancel(null);
        },
      },
    );
  };

  const handleRetryPayment = (parentOrderId: number) => {
    retryPaymentMutation.mutate(parentOrderId, {
      onSuccess: (data) => {
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        }
      },
      onError: (error: any) => {
        alert(
          error.response?.data?.message || t("orders_payment_retry_error"),
        );
      },
    });
  };

  const handleRepurchase = async (items: any[]) => {
    try {
      const promises = items.map((item) => {
        const productId = item.product_id || item.variant?.product_id;
        const variantId = item.variant_id;
        const product = item.variant?.product || item.product;
        return addToCartMutation.mutateAsync({
          productId,
          variantId,
          quantity: item.quantity,
          product,
          variant: item.variant,
        });
      });
      await Promise.all(promises);
      navigate("/cart");
    } catch (error) {
      alert(t("orders_add_cart_error"));
    }
  };

  const orderStatuses = [
    { key: "PENDING", label: t("orders_status_new") },
    { key: "CONFIRMED", label: t("orders_tab_confirmed") },
    { key: "PREPARING", label: t("orders_status_preparing_goods") },
    { key: "SHIPPING", label: t("orders_status_shipping") },
    { key: "COMPLETED", label: t("orders_tab_completed") },
  ];

  const renderReturnTimeline = (currentStatus: string) => {
    const returnStatuses = [
      { key: "FAILED", label: t("orders_status_delivery_failed") },
      { key: "RETURN_PENDING", label: t("orders_status_returning") },
      { key: "RETURNED", label: t("orders_status_returned") },
    ];

    const currentIndex = returnStatuses.findIndex(s => s.key === currentStatus);
    if (currentIndex === -1) return null;

    return (
      <div className="flex flex-row w-full mt-8 px-4 relative">
        {returnStatuses.map((s, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx <= currentIndex;

          return (
            <div key={s.key} className="flex-1 flex flex-col items-center relative group">
              {idx < returnStatuses.length - 1 && (
                <div className={`absolute top-5 left-1/2 w-full h-[3px] ${isActive ? 'bg-pink-500' : 'bg-gray-200'} -z-10 transition-all`}></div>
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] text-sm transition-all duration-300 ${isActive ? 'bg-pink-500 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] scale-110' : 'bg-white border-gray-300 text-gray-400 font-bold dark:bg-slate-800 dark:border-slate-600'}`}>
                {isCompleted ? <CheckCircle size={20} /> : idx + 1}
              </div>
              <p className={`text-[11px] mt-4 font-black uppercase tracking-wider text-center transition-all ${isActive ? 'text-pink-600 translate-y-1' : 'text-gray-400'}`}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderReturnRequestTimeline = (retReq: any) => {
    const steps = [
      { key: "PENDING", label: t("orders_return_waiting_approval") },
      { key: "APPROVED", label: t("orders_return_accepted") },
      { key: "SHIPPING", label: t("orders_return_waiting_pickup") },
      { key: "COMPLETED", label: t("orders_return_done") }
    ];

    let currentIndex = 0;
    if (retReq.status === "PENDING") {
      currentIndex = 0;
    } else if (retReq.status === "REJECTED") {
      steps[1] = { key: "REJECTED", label: t("orders_return_rejected_waiting_admin") };
      currentIndex = 1;
    } else if (retReq.status === "APPROVED_BY_SHOP" || retReq.status === "RESOLVED_BY_ADMIN") {
      currentIndex = 2;
    } else if (retReq.status === "COMPLETED") {
      currentIndex = 3;
    }

    return (
      <div className="flex flex-row w-full mt-8 px-4 relative">
        {steps.map((s, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx <= currentIndex;

          let stepColor = 'bg-pink-500 border-pink-500';
          let textColor = 'text-pink-600';
          let shadowColor = 'rgba(236,72,153,0.3)';

          if (s.key === "REJECTED") {
            stepColor = 'bg-red-500 border-red-500';
            textColor = 'text-red-600';
            shadowColor = 'rgba(239,68,68,0.3)';
          }

          return (
            <div key={s.key} className="flex-1 flex flex-col items-center relative group">
              {idx < steps.length - 1 && (
                <div className={`absolute top-5 left-1/2 w-full h-[3px] ${isActive && s.key !== "REJECTED" ? 'bg-pink-500' : 'bg-gray-200'} -z-10 transition-all`}></div>
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] text-sm transition-all duration-300 ${isActive ? `${stepColor} text-white shadow-[0_0_15px_${shadowColor}] scale-110` : 'bg-white border-gray-300 text-gray-400 font-bold'}`}>
                {isCompleted ? <CheckCircle size={20} /> : idx + 1}
              </div>
              <p className={`text-[11px] mt-4 font-black uppercase tracking-wider text-center transition-all ${isActive ? `${textColor} translate-y-1` : 'text-gray-400'}`}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimeline = (currentStatus: string, order?: any) => {
    if (order && order.returnRequests && order.returnRequests.length > 0) {
      return renderReturnRequestTimeline(order.returnRequests[0]);
    }
    if (["FAILED", "RETURN_PENDING", "RETURNED"].includes(currentStatus)) {
      return renderReturnTimeline(currentStatus);
    }
    if (currentStatus === "CANCELLED" || currentStatus === "CANCEL_REQUESTED")
      return null;

    const normalizedStatus =
      ["READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "DELIVERING", "SHIPPING", "DELIVERED"].includes(currentStatus)
        ? "SHIPPING"
        : currentStatus;
    const currentIndex = orderStatuses.findIndex(
      (s) => s.key === normalizedStatus,
    );

    return (
      <div className="flex flex-row w-full mt-8 px-4 relative">
        {orderStatuses.map((s, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx <= currentIndex;

          return (
            <div
              key={s.key}
              className="flex-1 flex flex-col items-center relative group"
            >
              {idx < orderStatuses.length - 1 && (
                <div
                  className={`absolute top-5 left-1/2 w-full h-[3px] ${isActive ? "bg-primary" : "bg-gray-200"} -z-10 transition-all`}
                ></div>
              )}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] text-sm transition-all duration-300 ${isActive ? "bg-primary border-primary text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)] scale-110" : "bg-white border-gray-300 text-gray-400 font-bold"}`}
              >
                {isCompleted ? <CheckCircle size={20} /> : idx + 1}
              </div>
              <p
                className={`text-[11px] mt-4 font-black uppercase tracking-wider text-center transition-all ${isActive ? "text-black translate-y-1" : "text-gray-400"}`}
              >
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const tabs = [
    {
      id: "all",
      label: t("orders_tab_all"),
      icon: <Package size={15} />,
      countKey: "ALL",
    },
    {
      id: "pending",
      label: t("orders_tab_pending"),
      icon: <Calendar size={15} />,
      countKey: "PENDING",
    },
    {
      id: "confirmed",
      label: t("orders_tab_confirmed"),
      icon: <CheckCircle size={15} />,
      countKey: "CONFIRMED",
    },
    {
      id: "preparing",
      label: t("orders_tab_preparing"),
      icon: <Package size={15} />,
      countKey: "PREPARING",
    },
    {
      id: "shipping",
      label: t("orders_tab_shipping"),
      icon: <Truck size={15} />,
      countKey: "DELIVERING",
    },
    {
      id: "completed",
      label: t("orders_tab_completed"),
      icon: <CheckCircle size={15} />,
      countKey: "COMPLETED",
    },
  ];



  const getStatusColor = (status: OrderStatus) => {
    if (["DELIVERED", "COMPLETED"].includes(status))
      return "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800";
    if (["DELIVERING", "SHIPPING", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT"].includes(status))
      return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
    if (["CANCELLED", "CANCEL_REQUESTED"].includes(status))
      return "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
    if (["RETURN_PENDING", "RETURNED"].includes(status))
      return "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800";
    return "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800";
  };

  return (
    <div className="min-h-screen bg-[#f5f5f1] px-4 pt-24 pb-32 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 rounded-[28px] border border-[#ebe7df] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#ee4d2d]">
                {t("orders_account")}
              </p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-900 dark:text-slate-100 md:text-4xl">
                {t("orders_title")}
              </h1>
            </div>

            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("orders_search_placeholder")}
                className="w-full rounded-2xl border border-slate-200 bg-[#f9fafb] px-4 py-3 pl-11 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#ee4d2d] focus:bg-white focus:ring-4 focus:ring-[#ee4d2d]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-700"
              />
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
            </div>
          </div>
        </div>

        <div className="mb-8 overflow-hidden">
          <div className="flex flex-nowrap items-center gap-2 overflow-hidden pb-1 [scrollbar-width:none]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2.5 font-bold transition-all duration-200 ${activeTab === tab.id ? "border-[#ee4d2d] bg-[#ee4d2d] text-white shadow-[0_10px_24px_rgba(238,77,45,0.25)]" : "border-slate-200 bg-white text-slate-600 hover:border-[#ee4d2d]/40 hover:text-[#ee4d2d] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
              >
                {tab.icon}
                <span className="text-[10px] uppercase tracking-[0.12em]">
                  {tab.label}
                </span>
                {(() => {
                  const getTabCount = (countKey: string) => {
                    if (!counts) return 0;
                    if (countKey === "COMPLETED") {
                      return (counts.DELIVERED || 0) + (counts.COMPLETED || 0);
                    }
                    if (countKey === "DELIVERING") {
                      return (counts.DELIVERING || 0) + (counts.SHIPPING || 0) + (counts.READY_FOR_PICKUP || 0) + (counts.PICKED_UP || 0) + (counts.IN_TRANSIT || 0);
                    }
                    return counts[countKey] || 0;
                  };
                  return counts && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}
                    >
                      {getTabCount(tab.countKey)}
                    </span>
                  );
                })()}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#ee4d2d]" size={48} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white p-16 text-center shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#fff2ee] text-[#ee4d2d] dark:bg-orange-950/40">
              <Package size={40} />
            </div>
            <h2 className="mb-2 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              {t("orders_empty_title")}
            </h2>
            <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {searchTerm
                ? t("orders_search_empty")
                : t("orders_empty_status")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="border-b border-slate-200 bg-[#fffaf8] px-4 py-3 dark:border-slate-700 dark:bg-slate-800 md:px-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-2 rounded-full border border-[#ffd9cc] bg-[#fff3ef] px-2.5 py-1.5 text-[#ee4d2d]">
                          <Store size={14} />
                          <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                            {order.shop?.shop_name || order.shop?.name || "MeeMart Mall"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <Hash size={13} />
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
                            {order.shop_order_code || order.order_code}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar size={13} />
                          <span className="text-xs font-medium">
                            {new Date(order.created_at).toLocaleDateString(getCurrentLocale())}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusColor(order.status)}`}
                      >
                        {getOrderStatusLabel(order.status, language)}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start">
                      <div className="space-y-3">
                        {order.items?.slice(0, 2).map((item, idx) => {
                          const product = item.variant?.product || item.product;
                          const imageUrl =
                            item.product_image_url ||
                            product?.images?.find((img: any) => img.is_primary)?.image_url ||
                            product?.images?.[0]?.image_url ||
                            "/placeholder.jpg";

                          return (
                            <div
                              key={idx}
                              onClick={() =>
                                navigate(`/products/${product?.slug || product?.id || item.product_id}`)
                              }
                              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8fafc] p-3 transition-all duration-200 hover:border-[#ee4d2d]/40 hover:bg-[#fff7f5] dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                            >
                              <div                               className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <img
                                  src={
                                    imageUrl.startsWith("http") || imageUrl.startsWith("data:")
                                      ? imageUrl
                                      : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${imageUrl}`
                                  }
                                  alt={item.product_name || product?.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-800 dark:text-slate-100">
                                    {item.product_name || product?.name}
                                  </p>
                                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                                    {Number(item.unit_price).toLocaleString()}₫
                                  </span>
                                </div>

                                {(item.size || item.color) && (
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                    {t("orders_item_type")} {item.size || t("orders_default_variant")}{item.color ? ` / ${item.color}` : ""}
                                  </p>
                                )}

                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                                    {t("orders_quantity")} {item.quantity}
                                  </span>
                                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#ee4d2d]">
                                    {t("orders_buy")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {(order.items?.length || 0) > 2 && (
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            +{(order.items?.length || 0) - 2} {t("orders_more_products")}
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>

                      <div className="rounded-[20px] border border-slate-200 bg-[#f8fafc] p-4 dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            {t("orders_total")}
                          </span>
                          <span className="text-xl font-black tracking-[-0.04em] text-slate-900">
                            {Number(order.final_amount || order.total_amount || 0).toLocaleString()}₫
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {Number(order.points_earned) > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">{t("orders_points_earned")}</span>
                              <span className="font-black text-emerald-600">+{order.points_earned}</span>
                            </div>
                          )}
                          {Number(order.points_used) > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">{t("orders_points_used")}</span>
                              <span className="font-black text-red-500">-{order.points_used}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-slate-500 dark:text-slate-400">{t("orders_payment_method")}</span>
                            <span className="font-black text-slate-700 dark:text-slate-200">{order.payment_method || "COD"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">{renderTimeline(order.status, order)}</div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 md:p-5">
                    {(() => {
                      const isUnpaidVNPay =
                        order.parentOrder?.payment_method === "VNPAY" &&
                        order.parentOrder?.payment_status === "UNPAID" &&
                        order.status !== "CANCELLED" &&
                        (new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60) <= 24;
                      if (isUnpaidVNPay) {
                        return (
                          <PaymentCountdownButton
                            createdAt={order.created_at}
                            onRetryPayment={() => handleRetryPayment(order.parentOrder!.id)}
                            className="inline-flex items-center justify-center rounded-xl bg-[#ee4d2d] px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-[#d9461c]"
                          />
                        );
                      }
                    })()}

                    {(() => {
                      const diffMins = (currentTime - new Date(order.created_at).getTime()) / 1000 / 60;
                      const canCancel = diffMins <= 30 && ["PENDING", "CONFIRMED", "PREPARING"].includes(order.status);

                      if (canCancel) {
                        const isRequest = order.status === "PREPARING";
                        return (
                          <button
                            onClick={() => handleOpenCancelModal(order.id, order.status)}
                            disabled={cancelOrderMutation.isPending}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-red-500 transition-all hover:bg-red-100 disabled:opacity-50"
                          >
                            <XCircle size={14} /> {isRequest ? t("orders_cancel_request") : t("orders_cancel")}
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {order.status === "DELIVERED" ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {order.returnRequests && order.returnRequests.length > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-red-500">
                            {order.returnRequests[0].status === "PENDING"
                              ? t("orders_return_requested")
                              : order.returnRequests[0].status === "APPROVED_BY_SHOP"
                                ? t("orders_return_approved")
                                : order.returnRequests[0].status === "REJECTED"
                                  ? t("orders_return_rejected")
                                  : order.returnRequests[0].status === "RESOLVED_BY_ADMIN"
                                    ? t("orders_admin_resolved")
                                    : t("orders_return_completed")}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenReturnModal(order)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-red-500 transition-all hover:bg-red-50"
                            >
                              {t("orders_return_refund")}
                            </button>
                            <button
                              onClick={() => handleConfirmReceipt(order.id)}
                              disabled={isConfirming !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
                            >
                              {isConfirming === order.id ? t("orders_processing") : t("orders_received")}
                            </button>
                          </>
                        )}
                      </div>
                    ) : order.status === "COMPLETED" ? (
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-900 hover:text-slate-900"
                      >
                        {t("orders_view_details")}
                      </button>
                    ) : order.status === "CANCELLED" || order.status === "CANCEL_REQUESTED" ? (
                      <>
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-900 hover:text-slate-900"
                        >
                          {t("orders_view_details")}
                        </button>
                        <button
                          onClick={() => handleRepurchase(order.items || [])}
                          disabled={addToCartMutation.isPending}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ee4d2d] px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-[#d9461c] disabled:opacity-50"
                        >
                          {t("orders_repurchase")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-900 hover:text-slate-900"
                      >
                        {t("orders_view_details")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {cancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md animate-in fade-in zoom-in rounded-[2rem] border-2 border-black bg-white p-6 duration-200 dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 transition-all hover:rotate-90 hover:text-black dark:hover:text-white"
            >
              <XCircle size={24} />
            </button>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">
              {orderToCancel.status === "PREPARING"
                ? t("orders_cancel_title")
                : t("orders_cancel")}
            </h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              {t("orders_cancel_modal_desc")}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {cancelledSuggestions.map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCancelReason(reason)}
                  className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-left text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("orders_cancel_reason_placeholder")}
              className="mb-6 h-32 w-full resize-none rounded-xl border-2 border-gray-200 p-4 text-sm font-medium outline-none transition-all focus:border-black focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            ></textarea>
            <button
              onClick={submitCancelOrder}
              disabled={cancelOrderMutation.isPending}
              className="w-full py-4 bg-black text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {cancelOrderMutation.isPending
                ? t("orders_processing")
                : t("orders_cancel_confirm")}
            </button>
          </div>
        </div>
      )}
      {returnModalOpen && selectedOrderForReturn && (
        <ReturnOrderModal
          isOpen={returnModalOpen}
          onClose={() => {
            setReturnModalOpen(false);
            setSelectedOrderForReturn(null);
          }}
          order={selectedOrderForReturn}
        />
      )}
    </div>
  );
};

export default OrderHistoryPage;
