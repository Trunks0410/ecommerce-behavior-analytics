import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Package, MapPin, CreditCard,
  CheckCircle, Calendar, Hash, Loader2, DollarSign,
  Star, X, Store
} from 'lucide-react';
import PaymentCountdownButton from '@/shared/components/ui/PaymentCountdownButton';
import { useOrderDetail, useRetryPayment, useShipmentDetail } from '@/hooks/useOrders';
import { useCreateReview, useUpdateReview } from '@/hooks/useReviews';
import { OrderStatus } from '@/shared/types/order.types';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAddToCart } from '@/hooks/useCart';
import { ReturnOrderModal } from '@/shared/components/modals/ReturnOrderModal';
import orderService from '@/services/orderService';
import { getOrderStatusLabel, getShipmentStatusLabel } from '@/shared/utils/statusUtils';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError } = useOrderDetail(Number(id));
  const { data: shipment, isLoading: isShipmentLoading } = useShipmentDetail(Number(id));
  const { data: systemSettings } = useSystemSettings() as any;
  const navigate = useNavigate();

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedProductToReview, setSelectedProductToReview] =
    useState<any>(null);
  const [rating, setRating] = useState(5);
  
  const [comment, setComment] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const queryClient = useQueryClient();
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);


  const createReviewMutation = useCreateReview();
  const updateReviewMutation = useUpdateReview();
  const retryPaymentMutation = useRetryPayment();
  const addToCartMutation = useAddToCart();

  const reviewSuggestions = [
    "Chất lượng sản phẩm tuyệt vời",
    "Đóng gói đẹp và chắc chắn",
    "Giao hàng nhanh",
    "Shop phục vụ rất tốt",
    "Sản phẩm giống mô tả",
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setComment((prev) => (prev ? `${prev}. ${suggestion}` : suggestion));
  };

  const handleConfirmReceipt = async () => {
    if (!window.confirm("Bạn xác nhận đã nhận đầy đủ hàng và muốn hoàn tất đơn hàng?")) return;
    setIsConfirming(true);
    try {
      await orderService.updateOrderStatus(Number(id), 'COMPLETED');
      alert("Xác nhận nhận hàng và hoàn tất đơn hàng thành công!");
      queryClient.invalidateQueries({ queryKey: ["order", Number(id)] });
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setIsConfirming(false);
    }
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

  const handleOpenReviewModal = (item: any, existingReview?: any) => {
    setSelectedProductToReview(item);
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || "");
      setIsUpdatingReview(true);
    } else {
      setRating(5);
      setComment("");
      setIsUpdatingReview(false);
    }
    setReviewModalOpen(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductToReview) return;

    const productId =
      selectedProductToReview.variant?.product_id ||
      selectedProductToReview.variant?.product?.id ||
      selectedProductToReview.product?.id;
    const payload = {
      order_id: order?.id,
      variant_id:
        selectedProductToReview.variant_id ||
        selectedProductToReview.variant?.id,
      rating,
      comment,
    };

    if (isUpdatingReview) {
      updateReviewMutation.mutate(
        { productId, payload },
        {
          onSuccess: () => {
            setReviewModalOpen(false);
            alert("Cập nhật đánh giá thành công!");
          },
          onError: (error: any) => {
            const errMsg =
              error?.response?.data?.message ||
              "Có lỗi xảy ra khi cập nhật đánh giá";
            alert(errMsg);
          },
        },
      );
    } else {
      createReviewMutation.mutate(
        { productId, payload },
        {
          onSuccess: () => {
            setReviewModalOpen(false);
            setComment("");
            setRating(5);
            alert("Đánh giá thành công! Bạn đã được tặng 100 điểm thưởng.");
          },
          onError: (error: any) => {
            const errMsg =
              error?.response?.data?.message ||
              "Có lỗi xảy ra khi gửi đánh giá";
            alert(errMsg);
          },
        },
      );
    }
  };

  const orderStatuses = [
    { key: "PENDING", label: "Đơn mới" },
    { key: "CONFIRMED", label: "Đã xác nhận" },
    { key: "PREPARING", label: "Chuẩn bị hàng" },
    { key: "SHIPPING", label: "Đang giao" },
    { key: "COMPLETED", label: "Hoàn thành" },
  ];



  const getStatusColor = (status: OrderStatus) => {
    if (['DELIVERED', 'COMPLETED'].includes(status)) return 'bg-green-50 text-green-600 border-green-200';
    if (['SHIPPING'].includes(status)) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (['CANCELLED', 'CANCEL_REQUESTED', 'FAILED'].includes(status)) return 'bg-red-50 text-red-600 border-red-200';
    if (['RETURN_PENDING', 'RETURNED'].includes(status)) return 'bg-pink-50 text-pink-600 border-pink-200';
    return 'bg-orange-50 text-orange-600 border-orange-200';
  };

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
      currentIndex = 2; // shipping / in-transit is next
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

  const isFailedDeliveryReturn = order && ['RETURN_PENDING', 'RETURNED'].includes(order.status) && (!order.returnRequests || order.returnRequests.length === 0);
  const displayStatus = isFailedDeliveryReturn ? 'FAILED' : order?.status;

  const renderTimeline = (currentStatus: string) => {
    if (!order) return null;
    if (['CANCELLED', 'CANCEL_REQUESTED', 'FAILED', 'RETURN_PENDING', 'RETURNED'].includes(currentStatus)) {
      let title = "Đơn hàng đã hủy";
      let desc = "Đơn hàng này đã bị hủy và không thể tiếp tục giao.";
      let colorClass = "text-red-600";
      let bgClass = "bg-red-50 border-red-200";
      let borderClass = "border-red-500";
      let symbol = "!";

      if (currentStatus === 'FAILED') {
        title = "Giao hàng thất bại";
        const failedHistory = shipment?.histories?.find(h => h.status === 'FAILED');
        desc = failedHistory?.note ? `Lý do: ${failedHistory.note}` : "Đơn hàng giao không thành công.";
      } else if (currentStatus === 'RETURN_PENDING') {
        if (order.returnRequests && order.returnRequests.length > 0) {
          const retReq = order.returnRequests[0];
          if (retReq.status === "PENDING") {
            title = "Chờ duyệt trả hàng";
            desc = "Yêu cầu trả hàng của bạn đang được người bán xem xét.";
          } else if (retReq.status === "APPROVED_BY_SHOP") {
            title = "Người bán đồng ý trả hàng";
            desc = "Người bán đã duyệt yêu cầu. Đang gán shipper đến thu hồi sản phẩm từ bạn.";
          } else if (retReq.status === "REJECTED") {
            title = "Người bán từ chối trả hàng";
            desc = "Cửa hàng đã từ chối yêu cầu trả hàng của bạn. Hệ thống đã tự động chuyển lên Ban quản trị (Admin) để phân xử.";
          } else {
            title = "Đang xử lý trả hàng";
            desc = "Yêu cầu trả hàng đang được xử lý.";
          }
        } else {
          title = "Đang chuyển hoàn";
          desc = "Đơn hàng giao thất bại và đang trên đường chuyển hoàn về shop.";
        }
        colorClass = "text-pink-600";
        bgClass = "bg-pink-50 border-pink-200";
        borderClass = "border-pink-500";
      } else if (currentStatus === 'RETURNED') {
        title = "Đã hoàn hàng";
        desc = "Đơn hàng đã hoàn trả về shop thành công.";
        colorClass = "text-gray-600";
        bgClass = "bg-gray-50 border-gray-200";
        borderClass = "border-gray-500";
      }

      return (
        <div className="space-y-6">
          <div className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 ${bgClass}`}>
            <div className={`w-16 h-16 bg-white rounded-full border-4 ${borderClass} flex items-center justify-center mb-4`}>
              <span className={`${colorClass} font-black text-2xl`}>{symbol}</span>
            </div>
            <h3 className={`text-xl font-black ${colorClass} uppercase mb-2`}>{title}</h3>
            <p className="text-sm font-bold text-gray-500">{desc}</p>
          </div>
          {order.returnRequests && order.returnRequests.length > 0 && (
            renderReturnRequestTimeline(order.returnRequests[0])
          )}
        </div>
      );
    }

    const effectiveStatus = currentStatus === "DELIVERED" ? "SHIPPING" : currentStatus;
    const currentIndex = orderStatuses.findIndex(s => s.key === effectiveStatus);

    return (
      <div className="flex flex-row w-full mt-8 px-4 relative">
        {orderStatuses.map((s, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx <= currentIndex;

          return (
            <div key={s.key} className="flex-1 flex flex-col items-center relative group">
              {idx < orderStatuses.length - 1 && (
                <div className={`absolute top-5 left-1/2 w-full h-[3px] ${isActive ? 'bg-primary' : 'bg-gray-200'} -z-10 transition-all`}></div>
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] text-sm transition-all duration-300 ${isActive ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(var(--color-primary),0.3)] scale-110' : 'bg-white border-gray-300 text-gray-400 font-bold'}`}>
                {isCompleted ? <CheckCircle size={20} /> : idx + 1}
              </div>
              <p className={`text-[11px] mt-4 font-black uppercase tracking-wider text-center transition-all ${isActive ? 'text-black translate-y-1' : 'text-gray-400'}`}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderShipmentHistory = () => {
    if (!shipment || !shipment.histories || shipment.histories.length === 0) return null;

    let displayHistories = shipment.histories;
    if (order && order.returnRequests && order.returnRequests.length > 0) {
      displayHistories = shipment.histories.filter(h => h.status !== 'IN_TRANSIT' && h.status !== 'RETURNED');
    }

    // Nếu là luồng giao hàng thất bại quay đầu, chỉ hiển thị tới trạng thái FAILED
    const failedIndex = displayHistories.findIndex(h => h.status === 'FAILED');
    if (failedIndex !== -1) {
      displayHistories = displayHistories.slice(failedIndex);
    }

    return (
      <div className="mt-8 border-t-2 border-gray-100 pt-8">
        <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
          <MapPin className="text-primary" size={24} /> Hành trình giao hàng
        </h3>
        
        {shipment.shipper && (
          <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200 mb-6 flex items-center gap-4">
            {shipment.shipper.avatar_url ? (
              <img src={shipment.shipper.avatar_url} alt="Shipper" className="w-12 h-12 rounded-full border-2 border-primary object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                {shipment.shipper.full_name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Tài xế giao hàng</p>
              <p className="font-bold">{shipment.shipper.full_name}</p>
              <p className="text-sm font-medium text-gray-600">{shipment.shipper.phone}</p>
            </div>
            {shipment.tracking_number && (
              <div className="ml-auto text-right">
                <p className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Mã vận đơn</p>
                <p className="font-bold text-primary">{shipment.tracking_number}</p>
              </div>
            )}
          </div>
        )}

        <div className="relative pl-6">
          <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-200"></div>
          <div className="space-y-6">
            {displayHistories.map((h, idx) => (
              <div key={h.id} className="relative flex gap-4">
                <div className={`absolute -left-6 top-1 w-6 h-6 rounded-full border-4 border-white ${idx === 0 ? 'bg-primary shadow-[0_0_10px_rgba(var(--color-primary),0.5)]' : 'bg-gray-300'}`}></div>
                <div className="flex-1">
                  <p className={`font-bold ${idx === 0 ? 'text-black' : 'text-gray-500'}`}>
                    {getShipmentStatusLabel(h.status)}
                  </p>
                  {h.location && (
                    <p className="text-sm font-medium text-gray-600 mt-1 flex items-center gap-1">
                      <MapPin size={14} /> {h.location}
                    </p>
                  )}
                  {h.note && (
                    <p className="text-sm text-gray-500 mt-1">{h.note}</p>
                  )}
                  {h.proof_image_url && (
                    <img src={h.proof_image_url} alt="Proof" className="mt-3 rounded-lg border border-gray-200 max-w-[200px] h-auto object-cover" />
                  )}
                  <p className="text-xs font-bold text-gray-400 mt-2">
                    {new Date(h.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading || isShipmentLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-32 px-6 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-black uppercase mb-4">
          Không tìm thấy đơn hàng
        </h1>
        <Link
          to="/orders"
          className="text-primary hover:underline font-bold uppercase text-sm"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const canReturn = (() => {
    if (order.status === 'DELIVERED') return true;
    if (order.status === 'COMPLETED') {
      const completedDate = new Date(order.updated_at);
      const daysSinceCompleted = (new Date().getTime() - completedDate.getTime()) / (1000 * 3600 * 24);
      return daysSinceCompleted <= 15;
    }
    return false;
  })();

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/orders"
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:text-primary transition-all bg-white px-5 py-3 rounded-xl border-2 border-black/10 hover:border-black shadow-sm group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-1 transition-transform"
            />{" "}
            Quay lại lịch sử
          </Link>
        </div>

        <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-gray-50 border-b-2 border-black/5 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-serif font-black tracking-tighter uppercase mb-4 flex items-center gap-3">
                <Package className="text-primary" size={32} /> Chi tiết đơn hàng
              </h1>
              <div className="flex items-center gap-6 flex-wrap">
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
                <div className="w-[2px] h-8 bg-gray-200 hidden md:block"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <Calendar size={12} /> Ngày đặt
                  </span>
                  <span className="font-bold text-sm text-black">
                    {new Date(order.created_at).toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className={`px-6 py-3 rounded-full border-2 font-black text-xs uppercase tracking-widest shadow-subtle ${getStatusColor(displayStatus as OrderStatus)}`}>
                {getOrderStatusLabel(displayStatus as OrderStatus)}
              </div>
              
              <div className="flex flex-row flex-wrap items-center gap-3">
                {order.status === 'DELIVERED' && (
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={isConfirming}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-full border-2 border-black shadow-subtle hover:shadow-none transition-all active:translate-y-[2px]"
                  >
                    {isConfirming ? 'Đang xử lý...' : 'Đã nhận hàng'}
                  </button>
                )}
                {canReturn && (
                  order.returnRequests && order.returnRequests.length > 0 ? (
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <span className="text-xs font-black text-red-500 uppercase tracking-widest bg-red-50 px-3 py-2 rounded-full border border-red-100">
                        {order.returnRequests[0].status === "PENDING"
                          ? "Đã gửi yêu cầu trả hàng"
                          : order.returnRequests[0].status === "APPROVED_BY_SHOP"
                            ? "Shop đã duyệt trả hàng"
                            : order.returnRequests[0].status === "REJECTED"
                              ? "Yêu cầu bị từ chối (Chờ Admin)"
                              : order.returnRequests[0].status === "RESOLVED_BY_ADMIN"
                                ? "Từ chối (Hệ thống đã phân xử)"
                                : "Hoàn thành trả hàng"}
                      </span>
                      {order.returnRequests[0].status === "REJECTED" && (
                        <span className="text-[10px] font-bold text-red-600 max-w-[250px] text-right leading-tight block">
                          Lý do Shop từ chối: {order.returnRequests[0].resolve_note || "Không có lý do"}
                        </span>
                      )}
                      {order.returnRequests[0].status === "RESOLVED_BY_ADMIN" && (
                        <span className="text-[10px] font-bold text-gray-500 max-w-[250px] text-right leading-tight block">
                          Đã bị từ chối và không thể yêu cầu lại. Lý do: {order.returnRequests[0].resolve_note || "Không hợp lệ"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setReturnModalOpen(true)}
                      className="px-6 py-3 bg-white text-red-600 border-2 border-red-200 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all shadow-subtle hover:shadow-none active:translate-y-[2px]"
                    >
                      Trả hàng / Hoàn tiền
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="p-8 border-b-2 border-black/5">
            {renderTimeline(displayStatus || '')}
            {renderShipmentHistory()}
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/30 border-b-2 border-black/5">
            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 border-b-2 border-black/10 pb-3">
                <MapPin className="text-primary" /> Thông tin nhận hàng
              </h3>
              <div className="bg-white p-6 rounded-2xl border-2 border-black/5 shadow-sm">
                <p className="text-sm font-medium text-gray-600 leading-relaxed">
                  {order.parentOrder?.shipping_address ||
                    order.shipping_address ||
                    "Chưa có thông tin nhận hàng"}
                </p>
                {order.parentOrder?.note && (
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      Ghi chú
                    </p>
                    <p className="text-sm font-medium italic text-gray-600">
                      {order.parentOrder.note}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 border-b-2 border-black/10 pb-3">
                <CreditCard className="text-primary" /> Thanh toán
              </h3>
              <div className="bg-white p-6 rounded-2xl border-2 border-black/5 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-200">
                  <span className="text-xs font-black uppercase text-gray-500">
                    Phương thức
                  </span>
                  <span className="text-sm font-black uppercase">
                    {(order.parentOrder?.payment_method ||
                      order.payment_method) === "COD"
                      ? "Thanh toán khi nhận hàng"
                      : order.parentOrder?.payment_method ||
                        order.payment_method}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-gray-500">
                    Trạng thái
                  </span>
                  <span
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      (order.parentOrder?.payment_status || order.payment_status) === "PAID" ||
                      ((order.parentOrder?.payment_method || order.payment_method) === "COD" &&
                        ["DELIVERED", "COMPLETED"].includes(order.status))
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {(order.parentOrder?.payment_status || order.payment_status) === "PAID" ||
                    ((order.parentOrder?.payment_method || order.payment_method) === "COD" &&
                      ["DELIVERED", "COMPLETED"].includes(order.status))
                      ? "Đã thanh toán"
                      : "Chưa thanh toán"}
                  </span>
                </div>
                {(order.parentOrder?.payment_method || order.payment_method) ===
                  "VNPAY" &&
                  (order.parentOrder?.payment_status ||
                    order.payment_status) === "UNPAID" &&
                  order.status !== "CANCELLED" &&
                  (new Date().getTime() -
                    new Date(order.created_at).getTime()) /
                    (1000 * 60 * 60) <=
                    24 && (
                    <PaymentCountdownButton
                      createdAt={order.created_at}
                      onRetryPayment={() =>
                        handleRetryPayment(
                          order.parentOrder?.id || order.parent_order_id || 0,
                        )
                      }
                      className="w-full mt-2 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black transition-colors"
                    />
                  )}
              </div>
            </div>
          </div>

          <div className="p-8">
            <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 mb-6">
              <Package className="text-primary" /> Danh sách sản phẩm
            </h3>

            <div className="space-y-4">
              {order.items?.map((item, idx) => {
                const product = item.variant?.product || item.product;
                const rawImageUrl =
                  item.product_image_url ||
                  product?.images?.find((img: any) => img.is_primary)
                    ?.image_url ||
                  product?.images?.[0]?.image_url ||
                  "/placeholder.jpg";
                const imageUrl =
                  rawImageUrl.startsWith("http") ||
                  rawImageUrl.startsWith("data:")
                    ? rawImageUrl
                    : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${rawImageUrl}`;
                const navigateProductId =
                  product?.slug ||
                  product?.id ||
                  (item.variant as any)?.product_id;
                const actualProductId =
                  product?.id || (item.variant as any)?.product_id;
                const color = item.color || item.variant_color;
                const size = item.size || item.variant_size;

                return (
                  <div
                    key={idx}
                    className="flex gap-6 items-center p-4 bg-gray-50 rounded-2xl border-2 border-black/5 hover:border-black/20 transition-colors"
                  >
                    <div
                      onClick={() =>
                        navigateProductId &&
                        navigate(`/products/${navigateProductId}`)
                      }
                      className="w-20 h-24 bg-white rounded-xl overflow-hidden border border-black/10 flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
                    >
                      <img
                        src={imageUrl}
                        alt={item.product_name || product?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow">
                      <p
                        onClick={() =>
                          navigateProductId &&
                          navigate(`/products/${navigateProductId}`)
                        }
                        className="text-sm font-black uppercase cursor-pointer hover:text-primary transition-colors"
                      >
                        {item.product_name || product?.name}
                      </p>
                      <p className="text-xs font-bold text-gray-400 mt-1">
                        {color || size
                          ? `Phân loại: ${size || ""} ${color ? `/ ${color}` : ""}`
                          : "Mặc định"}
                      </p>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-black text-primary">
                            {Number(item.unit_price).toLocaleString()}₫
                          </p>
                          <p className="text-xs font-black text-gray-500 bg-white px-3 py-1 rounded-full border border-black/10 shadow-sm">
                            x{item.quantity}
                          </p>
                        </div>

                        {order.status === "COMPLETED" &&
                          (() => {
                            const existingReview = order.reviews?.find(
                              (r: any) =>
                                Number(r.product_id) ===
                                Number(actualProductId),
                            );
                            return (
                              <button
                                onClick={() =>
                                  handleOpenReviewModal(item, existingReview)
                                }
                                className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-primary transition-colors flex items-center gap-1"
                              >
                                <Star
                                  size={14}
                                  className="fill-yellow-400 text-yellow-400"
                                />{" "}
                                {existingReview
                                  ? "Xem lại đánh giá"
                                  : "Đánh giá"}
                              </button>
                            );
                          })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Summary */}
          <div className="bg-black text-white p-8 sm:p-10 flex flex-col sm:flex-row justify-between items-center gap-8 shadow-[inset_0_10px_20px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 w-full sm:w-auto border-b border-white/20 sm:border-none pb-6 sm:pb-0 justify-center sm:justify-start">
              <DollarSign size={32} className="text-primary" />
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Cảm ơn bạn đã mua hàng
                </p>
                <p className="text-sm font-bold">Hy vọng bạn thích sản phẩm!</p>
              </div>
            </div>

            <div className="w-full sm:w-80 space-y-4">
              <div className="flex justify-between text-sm font-bold text-gray-400">
                <span>Tạm tính</span>
                <span className="text-white">
                  {Number(order.subtotal || 0).toLocaleString()}₫
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-400">
                <span>Phí vận chuyển</span>
                <span className="text-white">
                  {Number(order.shipping_fee).toLocaleString()}₫
                </span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-sm font-bold text-gray-400">
                  <span>Giảm giá</span>
                  <span className="text-red-400">
                    -{Number(order.discount_amount).toLocaleString()}₫
                  </span>
                </div>
              )}
              {Number(order.points_used) > 0 && (
                <div className="flex justify-between text-sm font-bold text-gray-400">
                  <span>Điểm đã dùng</span>
                  <span className="text-red-400">
                    -
                    {(
                      Number(order.points_used) *
                      (systemSettings?.redeemRate || 100)
                    ).toLocaleString()}
                    ₫ ({order.points_used} điểm)
                  </span>
                </div>
              )}
              <div className="flex justify-between items-end pt-4 border-t border-white/20">
                <span className="text-sm font-black uppercase tracking-widest">
                  Tổng cộng
                </span>
                <span className="text-4xl font-black text-primary tracking-tighter">
                  {Number(
                    order.final_amount || order.total_amount || 0,
                  ).toLocaleString()}
                  ₫
                </span>
              </div>
              {Number(order.points_earned) > 0 && (
                <div className="flex justify-between text-xs font-bold text-gray-400 mt-2">
                  <span>Điểm thưởng nhận được</span>
                  <span className="text-green-400">
                    +{order.points_earned} điểm
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Action Buttons */}
          {order.status === "DELIVERED" ? (
            <div className="p-8 bg-white border-t-2 border-black/5 flex justify-end gap-3">
              {order.returnRequests && order.returnRequests.length > 0 ? (
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs font-black text-red-500 uppercase tracking-widest bg-red-50 px-5 py-3 rounded-xl border border-red-100">
                    {order.returnRequests[0].status === "PENDING"
                      ? "Đã gửi yêu cầu trả hàng"
                      : order.returnRequests[0].status === "APPROVED_BY_SHOP"
                        ? "Đã duyệt trả hàng (Chờ Shipper)"
                        : order.returnRequests[0].status === "REJECTED"
                          ? "Yêu cầu bị từ chối (Chờ Admin)"
                          : order.returnRequests[0].status === "RESOLVED_BY_ADMIN"
                            ? "Admin đã xử lý tranh chấp"
                            : "Hoàn tất hoàn trả"}
                  </span>
                  {order.returnRequests[0].status === "REJECTED" && (
                    <span className="text-xs text-red-500 font-bold max-w-[400px] text-right">
                      Lý do từ chối: {order.returnRequests[0].resolve_note || "Không rõ"}
                    </span>
                  )}
                  {order.returnRequests[0].status === "RESOLVED_BY_ADMIN" && (
                    <span className="text-xs text-gray-500 font-bold max-w-[400px] text-right">
                      Kết luận của Admin: {order.returnRequests[0].resolve_note || "Đã đóng tranh chấp"}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setReturnModalOpen(true)}
                    className="px-6 py-3 bg-white text-red-600 border-2 border-red-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all shadow-subtle hover:shadow-none active:translate-y-[2px]"
                  >
                    Trả hàng / Hoàn tiền
                  </button>
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={isConfirming}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-xl border-2 border-black shadow-subtle hover:shadow-none transition-all active:translate-y-[2px]"
                  >
                    {isConfirming ? 'Đang xử lý...' : 'Đã nhận hàng'}
                  </button>
                </>
              )}
            </div>
          ) : (order.status === "CANCELLED" || order.status === "CANCEL_REQUESTED") ? (
            <div className="p-8 bg-white border-t-2 border-black/5 flex justify-end">
              <button
                onClick={() => handleRepurchase(order.items || [])}
                disabled={addToCartMutation.isPending}
                className="flex items-center gap-2 px-8 py-4 bg-primary text-white border-2 border-primary rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black hover:border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-y-1 disabled:opacity-50"
              >
                Mua lại đơn hàng này
              </button>
            </div>
          ) : null}

        </div>
      </div>

      <ReturnOrderModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        order={order}
      />

      {/* Review Modal */}
      {reviewModalOpen && selectedProductToReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-black rounded-[2rem] w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black hover:rotate-90 transition-all"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">
              Đánh giá sản phẩm
            </h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              Chia sẻ trải nghiệm của bạn và nhận 100 điểm thưởng!
            </p>

            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border-2 border-black/5">
              {(() => {
                const product =
                  selectedProductToReview.variant?.product ||
                  selectedProductToReview.product;
                const rawImg =
                  selectedProductToReview.product_image_url ||
                  product?.images?.find((img: any) => img.is_primary)
                    ?.image_url ||
                  product?.images?.[0]?.image_url ||
                  "/placeholder.jpg";
                const finalImgUrl =
                  rawImg.startsWith("http") || rawImg.startsWith("data:")
                    ? rawImg
                    : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8088"}${rawImg}`;
                const color =
                  selectedProductToReview.color ||
                  selectedProductToReview.variant_color;
                const size =
                  selectedProductToReview.size ||
                  selectedProductToReview.variant_size;
                return (
                  <>
                    <img
                      src={finalImgUrl}
                      alt="Product"
                      className="w-16 h-16 rounded-xl object-cover border border-black/10 bg-white"
                    />
                    <div>
                      <p className="font-black text-sm uppercase leading-tight line-clamp-2 mb-1">
                        {selectedProductToReview.product_name || product?.name}
                      </p>
                      <p className="text-xs text-gray-500 font-bold">
                        {color || size
                          ? `Phân loại: ${size || ""} ${color ? `/ ${color}` : ""}`
                          : "Mặc định"}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3 text-center">
                  Chất lượng sản phẩm
                </label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transform hover:scale-110 transition-transform"
                    >
                      <Star
                        size={32}
                        className={`${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                  Đánh giá chi tiết
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {reviewSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors border border-gray-200 active:scale-95"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full h-32 border-2 border-black/20 focus:border-black rounded-xl p-4 font-medium outline-none transition-all resize-none"
                  placeholder="Hãy chia sẻ cảm nhận của bạn về sản phẩm nhé..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={
                  createReviewMutation.isPending ||
                  updateReviewMutation.isPending
                }
                className="w-full py-4 bg-primary text-white border-2 border-black rounded-xl font-black uppercase tracking-widest hover:bg-black transition-colors active:translate-y-1 shadow-subtle hover:shadow-none disabled:opacity-50"
              >
                {createReviewMutation.isPending ||
                updateReviewMutation.isPending
                  ? "Đang gửi..."
                  : isUpdatingReview
                    ? "Cập nhật đánh giá"
                    : "Gửi đánh giá"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
