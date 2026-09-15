import React, { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/Card";
import { DollarSign, Info, RefreshCw } from "lucide-react";
import { getReconciliationStatusLabel } from "@/shared/utils/statusUtils";
import { useAppSelector } from "@/app/stores/hooks";
import orderService from "@/services/orderService";

export const ShipperReconciliationTab: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  const [collectedCODOrders, setCollectedCODOrders] = useState<any[]>([]);
  const [reconciliationHistory, setReconciliationHistory] = useState<any[]>([]);
  const [codLoading, setCodLoading] = useState(false);

  const fetchCollectedCOD = async () => {
    try {
      setCodLoading(true);
      const res = await orderService.getShipperCollectedCOD();
      setCollectedCODOrders(res.data || []);
    } catch (error) {
      console.error("Error fetching collected COD:", error);
    } finally {
      setCodLoading(false);
    }
  };

  const fetchReconciliationHistory = async () => {
    try {
      const res = await orderService.getShipperReconciliationHistory();
      setReconciliationHistory(res.data || []);
    } catch (error) {
      console.error("Error fetching reconciliation history:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCollectedCOD();
      fetchReconciliationHistory();
    }
  }, [user]);

  const totalHeldAmount = collectedCODOrders.reduce((sum, o) => sum + Number(o.cod_amount_collected || 0), 0);
  const totalHeldCount = collectedCODOrders.length;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-4xl font-bold mb-2">
          ĐỐI SOÁT COD SHIPPER
        </h1>
        <p className="text-gray-600 font-bold uppercase tracking-wider">
          Theo dõi số tiền mặt thu hộ (COD) đang giữ và lịch sử bàn giao đối soát bưu cục.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Column: Collected COD held by shipper */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-2 border-black shadow-subtle flex flex-col gap-4">
            <div className="pb-4 border-b border-black/10 flex justify-between items-center">
              <h3 className="font-serif text-xl font-bold">
                Đơn hàng đang giữ tiền COD ({totalHeldCount})
              </h3>
              <button
                onClick={fetchCollectedCOD}
                disabled={codLoading}
                className="px-3 py-1 border-2 border-black rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1 active:translate-y-0.5 shadow-xs"
              >
                <RefreshCw size={12} className={codLoading ? "animate-spin" : ""} />
                Làm mới
              </button>
            </div>

            {codLoading ? (
              <p className="text-gray-500 italic py-6">Đang tải dữ liệu...</p>
            ) : collectedCODOrders.length === 0 ? (
              <p className="text-gray-500 italic py-6 text-center">
                Bạn không giữ tiền mặt thu hộ (COD) nào.
              </p>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                {collectedCODOrders.map((order) => {
                  return (
                    <div
                      key={order.id}
                      className="p-4 border-2 border-black rounded-xl flex items-start gap-3 transition-all hover:bg-gray-50"
                    >
                      <div className="p-2 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg shrink-0">
                        <DollarSign size={18} />
                      </div>
                      <div className="flex-grow text-xs font-medium">
                        <div className="flex justify-between items-center font-bold mb-1">
                          <span className="font-mono text-sm">{order.shop_order_code}</span>
                          <span className="text-primary font-black text-sm">
                            {Number(order.cod_amount_collected || 0).toLocaleString()}₫
                          </span>
                        </div>
                        <p className="text-gray-500 mb-1">
                          <strong>Cửa hàng:</strong> {order.shop?.shop_name}
                        </p>
                        <p className="text-gray-500 mb-1">
                          <strong>Địa chỉ:</strong> {order.parentOrder?.shipping_address}
                        </p>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-black/10">
                          <span className="text-gray-400 font-normal">
                            Giao lúc: {new Date(order.updated_at || order.updatedAt).toLocaleString("vi-VN")}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-black text-[9px] uppercase tracking-wider">
                            Chờ nộp tiền
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Info & Summary area */}
        <div className="space-y-6">
          <Card className="p-6 border-2 border-black shadow-subtle flex flex-col gap-4 sticky top-6">
            <h3 className="font-serif text-lg font-bold border-b border-black/10 pb-2">
              Đối soát tự động
            </h3>

            <div className="space-y-4 text-xs font-bold text-gray-700">
              <div className="flex justify-between">
                <span>Số lượng đơn đã giao:</span>
                <span className="text-black text-sm">{totalHeldCount} đơn</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-dashed border-black/10 pt-3">
                <span className="text-gray-500">Tổng tiền mặt đang giữ:</span>
                <span className="text-3xl font-black text-primary">
                  {totalHeldAmount.toLocaleString()}₫
                </span>
              </div>
            </div>

            <div className="mt-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl flex gap-2.5 text-xs text-blue-900 leading-relaxed font-bold">
              <Info className="shrink-0 text-blue-600 mt-0.5" size={16} />
              <div>
                <p className="font-black uppercase mb-1">Hướng dẫn đối soát:</p>
                <p className="font-normal text-[11px]">
                  Hệ thống tự động ghi nhận số tiền mặt COD của các đơn hàng bạn đã giao thành công.
                </p>
                <p className="font-normal text-[11px] mt-1.5">
                  Vui lòng bàn giao đầy đủ số tiền mặt này cho Quản lý bưu cục vào cuối ngày. Quản lý sẽ xác nhận trên hệ thống để hoàn tất đối soát và giải phóng ví tiền của shop.
                </p>
                <p className="font-normal text-[11px] mt-1.5 text-red-700 font-bold">
                  ⚠️ Lưu ý: Nếu không nộp tiền hoặc nộp thiếu, tài khoản shipper của bạn sẽ bị tạm khóa ngay lập tức.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* History Section: span full width */}
        <div className="lg:col-span-3">
          <Card className="p-6 border-2 border-black shadow-subtle">
            <h3 className="font-serif text-xl font-bold border-b border-black/10 pb-4 mb-4">
              Lịch sử bàn giao & đối soát
            </h3>

            {reconciliationHistory.length === 0 ? (
              <p className="text-gray-500 italic py-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                Chưa có lịch sử đối soát nào được ghi nhận.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-black/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="pb-3">Mã phiên</th>
                      <th className="pb-3">Thời gian đối soát</th>
                      <th className="pb-3 text-right">Tổng tiền bàn giao</th>
                      <th className="pb-3 text-center">Trạng thái</th>
                      <th className="pb-3">Phản hồi từ quản lý</th>
                      <th className="pb-3">Danh sách đơn hàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 font-medium text-gray-700">
                    {reconciliationHistory.map((history) => {

                      const statusColors: Record<string, string> = {
                        PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
                        APPROVED: "bg-green-100 text-green-700 border-green-200",
                        REJECTED: "bg-red-100 text-red-700 border-red-200",
                      };
                      return (
                        <tr key={history.id} className="hover:bg-gray-50/50">
                          <td className="py-4 font-mono font-bold text-black">#{history.id}</td>
                          <td className="py-4">
                            {new Date(history.created_at || history.createdAt).toLocaleString("vi-VN")}
                          </td>
                          <td className="py-4 text-right font-black text-black">
                            {Number(history.amount_submitted).toLocaleString()}₫
                          </td>
                          <td className="py-4 text-center">
                            <span
                              className={`px-3 py-1 border text-[9px] font-black uppercase tracking-wider rounded-lg ${statusColors[history.status] || "bg-gray-100 text-gray-700"
                                }`}
                            >
                              {getReconciliationStatusLabel(history.status)}
                            </span>
                          </td>
                          <td className="py-4 max-w-xs truncate">{history.note || "-"}</td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-1">
                              {history.orders?.map((order: any) => (
                                <span
                                  key={order.id}
                                  className="px-2 py-0.5 bg-gray-100 border border-black/10 rounded font-mono text-[10px] text-gray-600"
                                >
                                  {order.shop_order_code}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};
