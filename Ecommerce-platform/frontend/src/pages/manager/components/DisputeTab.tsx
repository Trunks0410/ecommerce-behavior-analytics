import React, { useState } from "react";
import {
  AlertCircle,
  RefreshCcw,
  Loader2,
  Package,
} from "lucide-react";
import { useDisputes, useResolveDispute } from "@/hooks/useManager";

interface DisputeTabProps {
  addNotification: (msg: string) => void;
}

const REJECT_SUGGESTIONS = [
  "Lý do khiếu nại không hợp lệ",
  "Bằng chứng không đủ tính xác thực",
  "Shop không sai sót trong đơn hàng",
  "Sản phẩm bị hỏng do phía khách hàng",
  "Quá thời hạn khiếu nại",
];

export const DisputeTab: React.FC<DisputeTabProps> = ({ addNotification }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    returnId: number | null;
    orderCode: string;
    rejectNote: string;
  }>({
    isOpen: false,
    returnId: null,
    orderCode: "",
    rejectNote: "",
  });

  const [approveModal, setApproveModal] = useState<{
    isOpen: boolean;
    returnId: number | null;
    orderCode: string;
    resolveNote: string;
  }>({
    isOpen: false,
    returnId: null,
    orderCode: "",
    resolveNote: "",
  });

  const { data: disputes, isLoading: isDisputesLoading } = useDisputes();
  const resolveDisputeMutation = useResolveDispute();

  const handleResolveDispute = (
    id: number,
    orderCode: string,
    approved: boolean,
  ) => {
    if (approved) {
      setApproveModal({ isOpen: true, returnId: id, orderCode, resolveNote: "" });
    } else {
      // Use Modal for Reject
      setRejectModal({ isOpen: true, returnId: id, orderCode, rejectNote: "" });
    }
  };

  const handleSubmitApprove = () => {
    if (!approveModal.returnId) return;
    resolveDisputeMutation.mutate(
      {
        id: approveModal.returnId,
        approved: true,
        resolveNote: approveModal.resolveNote,
      },
      {
        onSuccess: () => {
          addNotification(`Đồng ý hoàn tiền cho đơn khiếu nại ${approveModal.orderCode}.`);
          setApproveModal({
            isOpen: false,
            returnId: null,
            orderCode: "",
            resolveNote: "",
          });
        },
      },
    );
  };

  const handleSubmitReject = () => {
    if (!rejectModal.returnId) return;
    resolveDisputeMutation.mutate(
      {
        id: rejectModal.returnId,
        approved: false,
        resolveNote: rejectModal.rejectNote,
      },
      {
        onSuccess: () => {
          addNotification(
            `Đã bác bỏ khiếu nại của đơn ${rejectModal.orderCode}.`,
          );
          setRejectModal({
            isOpen: false,
            returnId: null,
            orderCode: "",
            rejectNote: "",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-black uppercase">
            Xử lý tranh chấp & khiếu nại
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Giải quyết yêu cầu hoàn tiền hoặc trả hàng từ Database
          </p>
        </div>
        {/* Search bar */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Tìm theo Mã đơn hoặc Lý do..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-black rounded-xl py-2 px-4 text-xs font-bold focus:outline-none"
          />
        </div>
      </div>

      {isDisputesLoading ? (
        <div className="flex justify-center py-20 bg-white border-2 border-black rounded-[2.5rem]">
          <Loader2 className="animate-spin text-primary" size={36} />
        </div>
      ) : (
        <div className="bg-white border-2 border-black rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-6 md:p-8">
            {!disputes?.returns || disputes.returns.length === 0 ? (
              <div className="text-center py-16">
                <RefreshCcw size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
                  Không có yêu cầu tranh chấp khiếu nại nào
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.returns
                  .filter(
                    (d: any) =>
                      d.order_id?.toString().includes(searchTerm.toLowerCase()) ||
                      d.reason.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((dispute: any) => (
                    <div
                      key={dispute.id}
                      className="p-6 border-2 border-black rounded-2xl hover:shadow-subtle transition-all bg-white flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-black uppercase bg-black text-white px-3 py-1 rounded-md">
                              Đơn hàng #{dispute.order_id || dispute.shop_order_id}
                            </span>
                            <span
                              className={`text-xs font-black uppercase px-3 py-1 rounded-md border-2 ${
                                dispute.status === "RESOLVED_BY_ADMIN" ||
                                dispute.status === "COMPLETED"
                                  ? "bg-green-100 text-green-600 border-green-200"
                                  : "bg-red-100 text-red-600 border-red-200"
                              }`}
                            >
                              {dispute.status === "RESOLVED_BY_ADMIN" ||
                              dispute.status === "COMPLETED"
                                ? "Đã xử lý"
                                : dispute.status}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-600 mt-2">
                            Khách hàng:{" "}
                            {dispute.user?.profile?.full_name ||
                              dispute.user?.email ||
                              "Không rõ"}
                          </p>
                          <p className="text-sm font-bold text-red-500 mt-1">
                            Lý do: {dispute.reason}
                          </p>
                          {dispute.resolve_note && dispute.status === "REJECTED" && (
                            <p className="text-sm font-bold text-orange-500 mt-1">
                              Vendor từ chối: {dispute.resolve_note}
                            </p>
                          )}
                          <p className="text-sm font-medium text-gray-500 mt-1">
                            Số tiền hoàn:{" "}
                            {Number(
                              dispute.refund_amount ||
                                dispute.items?.reduce(
                                  (sum: number, item: any) =>
                                    sum + item.quantity * (item.orderItem?.unit_price || 0),
                                  0,
                                ) ||
                                0,
                            ).toLocaleString()}₫
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {dispute.status === "REJECTED" ? (
                            <>
                              <button
                                onClick={() =>
                                  handleResolveDispute(
                                    dispute.id,
                                    dispute.order_id?.toString() ||
                                      dispute.shop_order_id?.toString(),
                                    false,
                                  )
                                }
                                disabled={resolveDisputeMutation.isPending}
                                className="px-4 py-2 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 hover:text-black transition-all active:translate-y-1 disabled:opacity-50"
                              >
                                Bác bỏ
                              </button>
                              <button
                                onClick={() =>
                                  handleResolveDispute(
                                    dispute.id,
                                    dispute.order_id?.toString() ||
                                      dispute.shop_order_id?.toString(),
                                    true,
                                  )
                                }
                                disabled={resolveDisputeMutation.isPending}
                                className="px-4 py-2 border-2 border-black bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                              >
                                Hoàn tiền
                              </button>
                            </>
                          ) : (
                            <span
                              className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${
                                dispute.status === "RESOLVED_BY_ADMIN" ||
                                dispute.status === "COMPLETED"
                                  ? "bg-green-50 text-green-600 border-green-100"
                                  : "bg-red-50 text-red-500 border-red-100"
                              }`}
                            >
                              {dispute.resolve_note
                                ? `Ghi chú: ${dispute.resolve_note}`
                                : dispute.status === "RESOLVED_BY_ADMIN" ||
                                  dispute.status === "COMPLETED"
                                ? "Đã xử lý"
                                : dispute.status}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-3">
                          Sản phẩm khiếu nại
                        </p>
                        <div className="space-y-3">
                          {dispute.items?.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
                            >
                              {item.orderItem?.variant?.product?.images?.[0]?.image_url ? (
                                <img
                                  src={item.orderItem.variant.product.images[0].image_url}
                                  alt="product"
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <Package size={24} className="text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-bold">
                                  {item.orderItem?.product_name || "Sản phẩm"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.orderItem?.size} | {item.orderItem?.color}{" "}
                                  {item.orderItem?.sku ? `| SKU: ${item.orderItem.sku}` : ""}
                                </p>
                                <p className="text-xs font-black mt-1">
                                  Số lượng: {item.quantity}
                                </p>
                              </div>
                            </div>
                          ))}
                          {!dispute.items ||
                            (dispute.items.length === 0 && (
                              <p className="text-xs text-gray-500 italic">
                                Không có thông tin sản phẩm
                              </p>
                            ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-3 mt-3">
                          Ảnh minh chứng từ khách
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            try {
                              const urls = dispute.evidence_urls
                                ? JSON.parse(dispute.evidence_urls)
                                : [];
                              return urls.length > 0 ? (
                                urls.map((url: string, idx: number) => (
                                  <a href={url} target="_blank" rel="noreferrer" key={idx}>
                                    <img
                                      src={url}
                                      alt="Minh chứng"
                                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                                    />
                                  </a>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500 italic">
                                  Không có ảnh đính kèm
                                </p>
                              );
                            } catch (e) {
                              return (
                                <p className="text-xs text-gray-500 italic">
                                  Không có ảnh đính kèm
                                </p>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Return Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-black rounded-[2rem] max-w-md w-full p-8 shadow-brutal animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-serif font-black uppercase tracking-tight mb-2">
              Từ chối khiếu nại
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-6">
              Hủy yêu cầu hoàn tiền của đơn hàng #{rejectModal.orderCode}
            </p>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Lý do từ chối (Bắt buộc)
                </label>
                <textarea
                  value={rejectModal.rejectNote}
                  onChange={(e) =>
                    setRejectModal({
                      ...rejectModal,
                      rejectNote: e.target.value,
                    })
                  }
                  placeholder="Vui lòng nhập lý do từ chối rõ ràng..."
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-4 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Gợi ý lý do
                </label>
                <div className="flex flex-wrap gap-2">
                  {REJECT_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        setRejectModal({
                          ...rejectModal,
                          rejectNote: suggestion,
                        })
                      }
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[10px] font-bold rounded-lg transition-colors text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() =>
                  setRejectModal({
                    isOpen: false,
                    returnId: null,
                    orderCode: "",
                    rejectNote: "",
                  })
                }
                className="flex-1 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReject}
                disabled={
                  !rejectModal.rejectNote.trim() ||
                  resolveDisputeMutation.isPending
                }
                className="flex-1 py-3 bg-red-600 text-white border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-colors shadow-subtle active:translate-y-0.5 disabled:opacity-50"
              >
                {resolveDisputeMutation.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Approve Return Modal */}
      {approveModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-black rounded-[2rem] max-w-md w-full p-8 shadow-brutal animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-serif font-black uppercase tracking-tight mb-2">
              Chấp nhận khiếu nại (Hoàn tiền)
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-6">
              Đồng ý hoàn tiền cho đơn hàng #{approveModal.orderCode}
            </p>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Ghi chú xử lý (Tùy chọn)
                </label>
                <textarea
                  value={approveModal.resolveNote}
                  onChange={(e) =>
                    setApproveModal({
                      ...approveModal,
                      resolveNote: e.target.value,
                    })
                  }
                  placeholder="Nhập ghi chú xử lý hoàn tiền..."
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-4 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all min-h-[100px]"
                />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() =>
                  setApproveModal({
                    isOpen: false,
                    returnId: null,
                    orderCode: "",
                    resolveNote: "",
                  })
                }
                className="flex-1 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitApprove}
                disabled={resolveDisputeMutation.isPending}
                className="flex-grow py-3 bg-primary text-black border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-subtle active:translate-y-0.5 disabled:opacity-50"
              >
                {resolveDisputeMutation.isPending ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
