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
import { useState } from "react";
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
import { ReturnOrderModal } from "@/shared/components/modals/ReturnOrderModal";
import { useQueryClient } from "@tanstack/react-query";
import orderService from "@/services/orderService";
import { OrderStatus } from "@/shared/types/order.types";

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
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
    "Muốn thay đổi địa chỉ giao hàng",
    "Muốn thay đổi sản phẩm (màu sắc, kích thước...)",
    "Thay đổi ý định không muốn mua nữa",
    "Nhập sai thông tin (số điện thoại, email, địa chỉ...)",
    "Phát sinh việc đột xuất",
    "Giá cao",
    "Không hài lòng với sản phẩm/dịch vụ",
    "Lý do khác",
  ];

  const { data: orderResponse, isLoading } = useMyOrders(getStatusQuery());
  const { data: counts } = useMyOrderCounts();
  const cancelOrderMutation = useCancelOrder();
  const retryPaymentMutation = useRetryPayment();
  const addToCartMutation = useAddToCart();

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
    if (!window.confirm("Bạn xác nhận đã nhận đầy đủ hàng và muốn hoàn tất đơn hàng?")) return;
    setIsConfirming(orderId);
    try {
      await orderService.updateOrderStatus(orderId, 'COMPLETED');
      alert("Xác nhận nhận hàng và hoàn tất đơn hàng thành công!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderCounts"] });
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
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
      alert("Vui lòng nhập lý do hủy đơn");
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
          error.response?.data?.message || "Không thể tạo lại thanh toán VNPay",
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
      alert("Có lỗi xảy ra khi thêm vào giỏ hàng");
    }
  };

  const orderStatuses = [
    { key: "PENDING", label: "Đơn mới" },
    { key: "CONFIRMED", label: "Đã xác nhận" },
    { key: "PREPARING", label: "Chuẩn bị hàng" },
    { key: "SHIPPING", label: "Đang giao" },
    { key: "COMPLETED", label: "Hoàn thành" },
  ];

  const renderReturnTimeline = (currentStatus: string) => {
    const returnStatuses = [
      { key: "FAILED", label: "Giao thất bại" },
      { key: "RETURN_PENDING", label: "Đang chuyển hoàn" },
      { key: "RETURNED", label: "Đã hoàn hàng" },
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] text-sm transition-all duration-300 ${isActive ? 'bg-pink-500 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] scale-110' : 'bg-white border-gray-300 text-gray-400 font-bold'}`}>
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
      { key: "PENDING", label: "Đang chờ duyệt" },
      { key: "APPROVED", label: "Yêu cầu được chấp nhận" },
      { key: "SHIPPING", label: "Chờ lấy hàng" },
      { key: "COMPLETED", label: "Hoàn tất" }
    ];

    let currentIndex = 0;
    if (retReq.status === "PENDING") {
      currentIndex = 0;
    } else if (retReq.status === "REJECTED") {
      steps[1] = { key: "REJECTED", label: "Bị từ chối (Chờ Admin)" };
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
      label: "Tất cả",
      icon: <Package size={16} />,
      countKey: "ALL",
    },
    {
      id: "pending",
      label: "Chờ xác nhận",
      icon: <Calendar size={16} />,
      countKey: "PENDING",
    },
    {
      id: "confirmed",
      label: "Đã xác nhận",
      icon: <CheckCircle size={16} />,
      countKey: "CONFIRMED",
    },
    {
      id: "preparing",
      label: "Đang chuẩn bị",
      icon: <Package size={16} />,
      countKey: "PREPARING",
    },
    {
      id: "shipping",
      label: "Đang giao",
      icon: <Truck size={16} />,
      countKey: "DELIVERING",
    },
    {
      id: "completed",
      label: "Hoàn thành",
      icon: <CheckCircle size={16} />,
      countKey: "COMPLETED",
    },
    {
      id: "returns",
      label: "Trả hàng/Hoàn tiền",
      icon: <RefreshCcw size={16} />,
      countKey: "RETURNS",
    },
    {
      id: "cancelled",
      label: "Đã hủy",
      icon: <XCircle size={16} />,
      countKey: "CANCELLED",
    },
  ];



  const getStatusColor = (status: OrderStatus) => {
    if (["DELIVERED", "COMPLETED"].includes(status))
      return "bg-green-50 text-green-600 border-green-200";
    if (["DELIVERING", "SHIPPING", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT"].includes(status))
      return "bg-blue-50 text-blue-600 border-blue-200";
    if (["CANCELLED", "CANCEL_REQUESTED"].includes(status))
      return "bg-red-50 text-red-600 border-red-200";
    if (["RETURN_PENDING", "RETURNED"].includes(status))
      return "bg-pink-50 text-pink-600 border-pink-200";
    return "bg-orange-50 text-orange-600 border-orange-200";
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-serif font-black tracking-tighter uppercase mb-2">
              Lịch sử mua hàng
            </h1>
            <p className="text-gray-500 font-medium">
              Theo dõi và quản lý các đơn hàng của bạn
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm theo mã đơn hàng..."
              className="w-full bg-white border-2 border-black rounded-2xl px-6 py-4 pl-12 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
          </div>
        </div>

        {/* Tabs Group */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border-2 whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? "bg-primary text-white border-primary shadow-lg shadow-primary/30" : "bg-white text-gray-500 border-gray-200 hover:border-primary/50"}`}
            >
              {tab.icon}
              <span className="text-[11px] uppercase tracking-wider mt-[2px]">
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
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? "bg-white text-primary" : "bg-gray-100 text-gray-500"}`}
                  >
                    {getTabCount(tab.countKey)}
                  </span>
                );
              })()}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        ) : orderResponse?.orders.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-[2.5rem] p-20 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400">
              <Package size={40} />
            </div>
            <h2 className="text-2xl font-black uppercase mb-2">
              Không có đơn hàng nào
            </h2>
            <p className="text-gray-500 mb-8 max-w-xs">
              Bạn chưa có đơn hàng nào trong trạng thái này.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {[...(orderResponse?.orders || [])]
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .map((order) => (
                <div
                  key={order.id}
                  className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-subtle transition-all group"
                >
                  {/* Card Header */}
                  <div className="bg-gray-50/50 border-b-2 border-black/5 p-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 border-r-2 border-gray-200 pr-6">
                        <Store size={24} className="text-primary" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            Shop
                          </span>
                          <span className="font-black text-sm text-black uppercase">
                            {order.shop?.shop_name || order.shop?.name || "UTEShop Official"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col hidden md:flex">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                          <Hash size={12} /> Mã đơn hàng
                        </span>
                        <span className="font-mono font-black text-sm text-black">
                          {order.shop_order_code || order.order_code}
                        </span>
                      </div>
                      <div className="w-[2px] h-10 bg-gray-200 hidden md:block"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                          <Calendar size={12} /> Ngày đặt
                        </span>
                        <span className="font-bold text-sm text-black">
                          {new Date(order.created_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`px-4 py-2 rounded-full border-2 font-black text-[10px] uppercase tracking-widest shadow-subtle ${getStatusColor(order.status)}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                      <div className="flex flex-col gap-4 flex-grow max-w-xl">
                        {order.items?.slice(0, 2).map((item, idx) => {
                          const product = item.variant?.product || item.product;
                          const imageUrl =
                            item.product_image_url ||
                            product?.images?.find((img: any) => img.is_primary)
                              ?.image_url ||
                            product?.images?.[0]?.image_url ||
                            "/placeholder.jpg";

                          return (
                            <div
                              key={idx}
                              onClick={() =>
                                navigate(
                                  `/products/${product?.slug || product?.id || item.product_id}`,
                                )
                              }
                              className="flex items-center gap-4 cursor-pointer group/item"
                            >
                              <div className="w-20 h-24 bg-gray-50 rounded-xl overflow-hidden border-2 border-black/5 group-hover/item:border-primary transition-all relative shrink-0">
                                <img
                                  src={
                                    imageUrl.startsWith("http") ||
                                      imageUrl.startsWith("data:")
                                      ? imageUrl
                                      : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${imageUrl}`
                                  }
                                  alt={item.product_name || product?.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition-all">
                                  <ChevronRight
                                    className="text-white"
                                    size={20}
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <p className="text-sm font-black uppercase tracking-tight group-hover/item:text-primary transition-colors line-clamp-2">
                                  {item.product_name || product?.name}
                                </p>
                                {item.size || item.color ? (
                                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                                    Phân loại: {item.size || "Mặc định"}{" "}
                                    {item.color ? `/ ${item.color}` : ""}
                                  </p>
                                ) : null}
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-sm font-black text-primary">
                                    {Number(item.unit_price).toLocaleString()}₫
                                  </span>
                                  <span className="text-[10px] font-black text-gray-400">
                                    x{item.quantity}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {(order.items?.length || 0) > 2 && (
                          <div
                            className="flex items-center gap-4 pl-2 cursor-pointer"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            <div className="w-10 h-10 bg-gray-50 rounded-full border-2 border-dashed border-black/20 flex items-center justify-center text-xs font-black text-gray-500">
                              +{(order.items?.length || 0) - 2}
                            </div>
                            <span className="text-xs font-black text-gray-500 uppercase hover:text-primary transition-colors hover:underline">
                              Xem thêm sản phẩm
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-center md:text-right">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                          Tổng thanh toán
                        </p>
                        <p className="text-3xl font-black text-black tracking-tighter">
                          {Number(
                            order.final_amount || order.total_amount || 0,
                          ).toLocaleString()}
                          ₫
                        </p>
                        {Number(order.points_earned) > 0 && (
                          <p className="text-[10px] font-bold text-green-500 mt-1 uppercase tracking-widest">
                            +{order.points_earned} điểm
                          </p>
                        )}
                        {Number(order.points_used) > 0 && (
                          <p className="text-[10px] font-bold text-red-400 mt-1 uppercase tracking-widest">
                            Đã dùng: {order.points_used} điểm
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Status Timeline */}
                    {renderTimeline(order.status, order)}
                  </div>

                  {/* Card Footer */}
                  <div className="px-8 py-6 bg-gray-50/30 flex flex-col sm:flex-row justify-end items-center gap-4 border-t-2 border-black/5">
                    {(() => {
                      const isUnpaidVNPay =
                        order.parentOrder?.payment_method === "VNPAY" &&
                        order.parentOrder?.payment_status === "UNPAID" &&
                        order.status !== "CANCELLED" &&
                        (new Date().getTime() -
                          new Date(order.created_at).getTime()) /
                        (1000 * 60 * 60) <=
                        24;
                      if (isUnpaidVNPay) {
                        return (
                          <PaymentCountdownButton
                            createdAt={order.created_at}
                            onRetryPayment={() =>
                              handleRetryPayment(order.parentOrder!.id)
                            }
                            className="flex items-center justify-center min-w-[140px] px-6 py-3 border-2 border-primary text-white bg-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-y-1"
                          />
                        );
                      }
                    })()}
                    {(() => {
                      const diffMins =
                        (currentTime - new Date(order.created_at).getTime()) /
                        1000 /
                        60;
                      const canCancel =
                        diffMins <= 30 &&
                        ["PENDING", "CONFIRMED", "PREPARING"].includes(
                          order.status,
                        );

                      if (canCancel) {
                        const isRequest = order.status === "PREPARING";
                        return (
                          <button
                            onClick={() =>
                              handleOpenCancelModal(order.id, order.status)
                            }
                            disabled={cancelOrderMutation.isPending}
                            className="flex items-center gap-2 px-6 py-3 border-2 border-red-200 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all active:translate-y-1 disabled:opacity-50"
                          >
                            <XCircle size={14} />{" "}
                            {isRequest ? "Gửi yêu cầu hủy" : "Hủy đơn hàng"}
                          </button>
                        );
                      }
                      return null;
                    })()}
                    {order.status === "DELIVERED" ? (
                      <div className="flex gap-2">
                        {order.returnRequests && order.returnRequests.length > 0 ? (
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                            {order.returnRequests[0].status === "PENDING"
                              ? "Đã yêu cầu trả hàng"
                              : order.returnRequests[0].status === "APPROVED_BY_SHOP"
                                ? "Yêu cầu trả hàng đã duyệt"
                                : order.returnRequests[0].status === "REJECTED"
                                  ? "Trả hàng bị từ chối (Chờ Admin)"
                                  : order.returnRequests[0].status === "RESOLVED_BY_ADMIN"
                                    ? "Admin đã xử lý trả hàng"
                                    : "Hoàn thành trả hàng"}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenReturnModal(order)}
                              className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 border-2 border-red-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all active:translate-y-1"
                            >
                              Trả hàng / Hoàn tiền
                            </button>
                            <button
                              onClick={() => handleConfirmReceipt(order.id)}
                              disabled={isConfirming !== null}
                              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all active:translate-y-1 shadow-subtle hover:shadow-none disabled:opacity-50"
                            >
                              {isConfirming === order.id ? "Đang xử lý..." : "Đã nhận hàng"}
                            </button>
                          </>
                        )}
                      </div>
                    ) : order.status === "COMPLETED" ? (
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all active:translate-y-1"
                      >
                        Xem chi tiết đơn hàng
                      </button>
                    ) : order.status === "CANCELLED" ||
                      order.status === "CANCEL_REQUESTED" ? (
                      <>
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="flex items-center gap-2 px-6 py-3 bg-white text-black border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all active:translate-y-1"
                        >
                          Xem chi tiết đơn
                        </button>
                        <button
                          onClick={() => handleRepurchase(order.items || [])}
                          disabled={addToCartMutation.isPending}
                          className="flex items-center gap-2 px-6 py-3 bg-primary text-white border-2 border-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-y-1 disabled:opacity-50"
                        >
                          Mua lại
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all active:translate-y-1"
                      >
                        Xem chi tiết đơn
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
          <div className="bg-white border-2 border-black rounded-[2rem] w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black hover:rotate-90 transition-all"
            >
              <XCircle size={24} />
            </button>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">
              {orderToCancel.status === "PREPARING"
                ? "Yêu cầu hủy đơn"
                : "Hủy đơn hàng"}
            </h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {cancelledSuggestions.map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCancelReason(reason)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors border border-gray-200 active:scale-95 text-left"
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy đơn..."
              className="w-full h-32 p-4 rounded-xl border-2 border-gray-200 focus:border-black focus:ring-4 focus:ring-primary/10 outline-none resize-none mb-6 font-medium text-sm transition-all"
            ></textarea>
            <button
              onClick={submitCancelOrder}
              disabled={cancelOrderMutation.isPending}
              className="w-full py-4 bg-black text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {cancelOrderMutation.isPending
                ? "Đang xử lý..."
                : "Xác nhận hủy đơn"}
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
