import React, { useState, useEffect, useCallback } from 'react';
import {
   RefreshCw,
   Loader2,
   Clock,
   CheckCircle2,
   XCircle,
   ArrowUpRight,
   Search,
   DollarSign,
   Calendar,
   User,
   Store,
   Landmark,
   X,
   Info,
} from 'lucide-react';
import { adminService } from '@/services/adminService';

interface WithdrawalLogTabProps {
   showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
   showConfirm: (message: string, onConfirm: () => void) => void;
}

export const WithdrawalLogTab = ({ showToast }: WithdrawalLogTabProps) => {
   const [logs, setLogs] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   // Filters & Pagination
   const [page, setPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [statusFilter, setStatusFilter] = useState("");
   const [searchQuery, setSearchQuery] = useState("");
   const [fromDate, setFromDate] = useState("");
   const [toDate, setToDate] = useState("");

   // Selected Payout Detail Modal State
   const [selectedPayout, setSelectedPayout] = useState<any | null>(null);

   const fetchLogs = useCallback(async () => {
      setLoading(true);
      try {
         const filters = {
            status: statusFilter || undefined,
            search: searchQuery || undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
         };
         const res = await adminService.getWithdrawalLogs(page, 20, filters);
         setLogs(res.data?.logs || []);
         setTotalPages(res.data?.totalPages || 1);
      } catch (e: any) {
         console.error(e);
         showToast(e.response?.data?.message || "Lỗi tải lịch sử rút tiền", "error");
      } finally {
         setLoading(false);
      }
   }, [page, statusFilter, searchQuery, fromDate, toDate, showToast]);

   useEffect(() => {
      fetchLogs();
   }, [fetchLogs]);

   const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0));

   const getStatusDisplay = (status: string) => {
      switch (status) {
         case "COMPLETED":
            return {
               label: "Đã chuyển tiền",
               color: "bg-green-100 text-green-800 border-green-300",
               icon: <CheckCircle2 size={12} />,
            };
         case "PENDING":
         case "PENDING_APPROVAL":
            return {
               label: "Chờ duyệt",
               color: "bg-yellow-100 text-yellow-800 border-yellow-300",
               icon: <Clock size={12} />,
            };
         case "PROCESSING":
            return {
               label: "Đang xử lý",
               color: "bg-blue-100 text-blue-800 border-blue-300",
               icon: <ArrowUpRight size={12} />,
            };
         case "REJECTED":
            return {
               label: "Đã từ chối",
               color: "bg-red-100 text-red-800 border-red-300",
               icon: <XCircle size={12} />,
            };
         default:
            return {
               label: status,
               color: "bg-gray-100 text-gray-800 border-gray-300",
               icon: <Clock size={12} />,
            };
      }
   };

   const formatTime = (timeStr: string) => {
      if (!timeStr) return "N/A";
      const date = new Date(timeStr);
      return date.toLocaleString("vi-VN", {
         year: "numeric",
         month: "2-digit",
         day: "2-digit",
         hour: "2-digit",
         minute: "2-digit",
      });
   };

   return (
      <div className="space-y-8">
         {/* Title bar */}
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-subtle border-2 border-black">
                     <DollarSign size={22} />
                  </div>
                  <h1 className="font-serif text-2xl font-black text-black">LỊCH SỬ RÚT TIỀN VENDOR</h1>
               </div>
               <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  Xem và tìm kiếm lịch sử yêu cầu rút tiền của các gian hàng trên toàn hệ thống
               </p>
            </div>

            <button
               onClick={() => {
                  setPage(1);
                  fetchLogs();
               }}
               disabled={loading}
               className="flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-wider bg-white hover:bg-gray-50 active:translate-y-[2px] transition-all shadow-subtle text-black disabled:opacity-50"
            >
               {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
               Tải lại
            </button>
         </div>

         {/* Filters Card */}
         <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-brutal space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Search by shop/bank */}
               <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-black">
                     Tìm kiếm từ khóa
                  </label>
                  <div className="relative">
                     <input
                        type="text"
                        placeholder="Tên shop, số tài khoản..."
                        value={searchQuery}
                        onChange={(e) => {
                           setSearchQuery(e.target.value);
                           setPage(1);
                        }}
                        className="w-full bg-gray-50 border-2 border-black rounded-xl pl-10 pr-4 py-2.5 font-bold text-xs focus:outline-none focus:ring-4 focus:ring-black/5 text-black"
                     />
                     <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  </div>
               </div>

               {/* Status filter */}
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-black">
                     Trạng thái yêu cầu
                  </label>
                  <select
                     value={statusFilter}
                     onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                     }}
                     className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2.5 font-bold text-xs focus:outline-none text-black"
                  >
                     <option value="">Tất cả trạng thái</option>
                     <option value="PENDING">Chờ duyệt (Pending)</option>
                     <option value="PROCESSING">Đang xử lý (Processing)</option>
                     <option value="COMPLETED">Đã chuyển tiền (Completed)</option>
                     <option value="REJECTED">Đã từ chối (Rejected)</option>
                  </select>
               </div>

               {/* Date range from */}
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-black">
                     Từ ngày yêu cầu
                  </label>
                  <input
                     type="date"
                     value={fromDate}
                     onChange={(e) => {
                        setFromDate(e.target.value);
                        setPage(1);
                     }}
                     className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2 font-bold text-xs focus:outline-none text-black"
                  />
               </div>

               {/* Date range to */}
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-black">
                     Đến ngày yêu cầu
                  </label>
                  <input
                     type="date"
                     value={toDate}
                     onChange={(e) => {
                        setToDate(e.target.value);
                        setPage(1);
                     }}
                     className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2 font-bold text-xs focus:outline-none text-black"
                  />
               </div>
            </div>

            {/* Clear filters button */}
            {(searchQuery || statusFilter || fromDate || toDate) && (
               <div className="flex justify-end pt-2">
                  <button
                     onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("");
                        setFromDate("");
                        setToDate("");
                        setPage(1);
                     }}
                     className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
                  >
                     <X size={12} /> Xóa bộ lọc
                  </button>
               </div>
            )}
         </div>

         {/* Payout Logs Table */}
         <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-brutal">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b-2 border-black bg-gray-50 text-[10px] font-black uppercase tracking-widest text-black">
                        <th className="p-4 md:p-6 w-36">Thời gian yêu cầu</th>
                        <th className="p-4 md:p-6 w-56">Gian hàng / Vendor</th>
                        <th className="p-4 md:p-6 w-40">Số tiền rút</th>
                        <th className="p-4 md:p-6">Thông tin ngân hàng</th>
                        <th className="p-4 md:p-6 w-36">Trạng thái</th>
                        <th className="p-4 md:p-6 w-24 text-center">Tác vụ</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-xs text-black">
                     {loading ? (
                        <tr>
                           <td colSpan={6} className="p-20 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-3">
                                 <Loader2 size={32} className="animate-spin text-black" />
                                 <span className="font-bold">Đang tải lịch sử rút tiền...</span>
                              </div>
                           </td>
                        </tr>
                     ) : logs.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="p-20 text-center text-gray-500 font-bold">
                              Không tìm thấy lịch sử yêu cầu rút tiền nào
                           </td>
                        </tr>
                     ) : (
                        logs.map((log) => {
                           const status = getStatusDisplay(log.status);
                           const vendorName = log.shop?.vendor?.profile?.full_name || "N/A";
                           return (
                              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="p-4 md:p-6 font-bold text-gray-500 whitespace-nowrap">
                                    {formatTime(log.created_at)}
                                 </td>
                                 <td className="p-4 md:p-6">
                                    <div className="flex items-center gap-2">
                                       <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden border border-black/10 flex items-center justify-center shrink-0">
                                          {log.shop?.shop_logo ? (
                                             <img src={log.shop.shop_logo} alt="shop logo" className="w-full h-full object-cover" />
                                          ) : (
                                             <Store size={14} className="text-gray-400" />
                                          )}
                                       </div>
                                       <div>
                                          <p className="font-black line-clamp-1">{log.shop?.shop_name || "Gian hàng vi phạm"}</p>
                                          <p className="text-[10px] text-gray-400 line-clamp-1">Vendor: {vendorName}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-4 md:p-6 font-black text-sm text-black">
                                    {fmt(log.amount)}₫
                                 </td>
                                 <td className="p-4 md:p-6">
                                    <div className="flex items-start gap-1.5">
                                       <Landmark size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                       <div>
                                          <p className="font-bold">{log.bank_name || "N/A"}</p>
                                          <p className="text-[10px] text-gray-500 font-mono">STK: {log.bank_account || "N/A"}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-4 md:p-6 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border-2 flex items-center gap-1 w-max ${status.color}`}>
                                       {status.icon}
                                       {status.label}
                                    </span>
                                 </td>
                                 <td className="p-4 md:p-6 text-center">
                                    <button
                                       onClick={() => setSelectedPayout(log)}
                                       className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-black rounded-lg font-black text-[10px] uppercase tracking-wider bg-white hover:bg-black hover:text-white transition-all shadow-subtle active:translate-y-[1px]"
                                       title="Xem chi tiết kỹ thuật"
                                    >
                                       <Info size={12} /> Chi tiết
                                    </button>
                                 </td>
                              </tr>
                           );
                        })
                     )}
                  </tbody>
               </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
               <div className="p-6 border-t-2 border-black bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">
                     Trang {page} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                     <button
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border-2 border-black rounded-xl font-black text-[10px] uppercase bg-white hover:bg-gray-50 active:translate-y-[2px] transition-all shadow-subtle disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none text-black"
                     >
                        Trước
                     </button>
                     <button
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border-2 border-black rounded-xl font-black text-[10px] uppercase bg-white hover:bg-gray-50 active:translate-y-[2px] transition-all shadow-subtle disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none text-black"
                     >
                        Sau
                     </button>
                  </div>
               </div>
            )}
         </div>

         {/* Payout detail Modal */}
         {selectedPayout && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white border-4 border-black rounded-3xl w-full max-w-lg overflow-hidden shadow-brutal animate-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="p-6 bg-black text-white flex items-center justify-between border-b-4 border-black">
                     <div className="flex items-center gap-2">
                        <DollarSign size={20} className="text-green-500" />
                        <h3 className="font-serif text-lg font-black uppercase tracking-wider">Chi Tiết Lệnh Rút Tiền</h3>
                     </div>
                     <button
                        onClick={() => setSelectedPayout(null)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-white"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-4">
                     <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden border border-black/10 flex items-center justify-center shrink-0">
                           {selectedPayout.shop?.shop_logo ? (
                              <img src={selectedPayout.shop.shop_logo} alt="shop" className="w-full h-full object-cover" />
                           ) : (
                              <Store size={20} className="text-gray-400" />
                           )}
                        </div>
                        <div>
                           <h4 className="font-black text-sm uppercase text-black">{selectedPayout.shop?.shop_name || "Gian hàng vi phạm"}</h4>
                           <p className="text-xs text-gray-500">Mã yêu cầu: #{selectedPayout.id}</p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-gray-500 font-bold uppercase">Số tiền rút:</span>
                           <span className="font-black text-base text-red-600">{fmt(selectedPayout.amount)}₫</span>
                        </div>

                        <div className="bg-gray-50 border-2 border-black rounded-xl p-3.5 space-y-2 text-xs">
                           <p className="font-black uppercase text-[10px] text-gray-400 mb-1 border-b border-gray-200 pb-1">Tài khoản nhận tiền</p>
                           <div className="flex justify-between">
                              <span className="text-gray-500 font-bold">Ngân hàng:</span>
                              <span className="font-black text-black">{selectedPayout.bank_name || "N/A"}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-gray-500 font-bold">Số tài khoản:</span>
                              <span className="font-black text-black font-mono">{selectedPayout.bank_account || "N/A"}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-gray-500 font-bold">Chủ tài khoản:</span>
                              <span className="font-black text-black uppercase">{selectedPayout.shop?.bank_account_name || "N/A"}</span>
                           </div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                           <span className="text-gray-500 font-bold uppercase">Thời gian tạo:</span>
                           <span className="font-bold text-black">{formatTime(selectedPayout.created_at)}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                           <span className="text-gray-500 font-bold uppercase">Trạng thái:</span>
                           <span className={`px-2 py-0.5 rounded border ${getStatusDisplay(selectedPayout.status).color} text-[10px] font-black uppercase`}>
                              {getStatusDisplay(selectedPayout.status).label}
                           </span>
                        </div>

                        {selectedPayout.status === "COMPLETED" && (
                           <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 space-y-1 text-xs">
                              <p className="font-black uppercase text-[10px] text-emerald-800">Thông tin xử lý</p>
                              <div className="flex justify-between">
                                 <span className="text-emerald-700 font-bold">Người duyệt:</span>
                                 <span className="font-black text-emerald-900">{selectedPayout.processor?.profile?.full_name || selectedPayout.processor?.email || "Admin"}</span>
                              </div>
                              <div className="flex justify-between">
                                 <span className="text-emerald-700 font-bold">Thời gian duyệt:</span>
                                 <span className="font-bold text-emerald-900">{formatTime(selectedPayout.updated_at)}</span>
                              </div>
                           </div>
                        )}

                        {selectedPayout.status === "REJECTED" && (
                           <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3.5 space-y-1 text-xs">
                              <p className="font-black uppercase text-[10px] text-red-800">Yêu cầu bị từ chối</p>
                              <div className="flex justify-between mb-1">
                                 <span className="text-red-700 font-bold">Người từ chối:</span>
                                 <span className="font-black text-red-900">{selectedPayout.processor?.profile?.full_name || selectedPayout.processor?.email || "Admin"}</span>
                              </div>
                              <div>
                                 <span className="text-red-700 font-bold">Lý do từ chối:</span>
                                 <p className="mt-1 bg-white p-2 border border-red-200 rounded text-red-900 font-bold leading-relaxed">{selectedPayout.reject_reason || "Không có lý do cụ thể"}</p>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 bg-gray-50 border-t-2 border-black flex justify-end">
                     <button
                        onClick={() => setSelectedPayout(null)}
                        className="px-6 py-2.5 border-2 border-black rounded-xl font-black text-xs uppercase bg-white hover:bg-gray-100 active:translate-y-[2px] transition-all shadow-subtle text-black"
                     >
                        Đóng
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
