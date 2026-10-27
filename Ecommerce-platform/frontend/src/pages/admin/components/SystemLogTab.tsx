import React, { useState, useEffect, useCallback } from 'react';
import {
   RefreshCw,
   Loader2,
   Search,
   X,
   ClipboardList,
   Activity,
   Calendar,
   User,
   Eye,
   Info,
} from 'lucide-react';
import { adminService } from '@/services/adminService';

interface SystemLogTabProps {
   showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
   showConfirm: (message: string, onConfirm: () => void) => void;
}

export const SystemLogTab = ({ showToast }: SystemLogTabProps) => {
   const [logs, setLogs] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   // Filters & Pagination
   const [page, setPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [actionFilter, setActionFilter] = useState("");
   const [searchQuery, setSearchQuery] = useState("");
   const [fromDate, setFromDate] = useState("");
   const [toDate, setToDate] = useState("");

   // Log Detail Modal State
   const [selectedLog, setSelectedLog] = useState<any | null>(null);

   const fetchLogs = useCallback(async () => {
      setLoading(true);
      try {
         const filters = {
            action_type: actionFilter || undefined,
            search: searchQuery || undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
         };
         const res = await adminService.getActivityLogs(page, 20, filters);
         setLogs(res.data?.logs || []);
         setTotalPages(res.data?.totalPages || 1);
      } catch (e: any) {
         console.error(e);
         showToast(e.response?.data?.message || "Lỗi tải nhật ký hệ thống", "error");
      } finally {
         setLoading(false);
      }
   }, [page, actionFilter, searchQuery, fromDate, toDate, showToast]);

   useEffect(() => {
      fetchLogs();
   }, [fetchLogs]);

   const getActionBadge = (action: string) => {
      switch (action) {
         case "SHOP_APPROVE":
            return "bg-emerald-100 text-emerald-800 border-emerald-300";
         case "SHOP_REJECT":
            return "bg-rose-100 text-rose-800 border-rose-300";
         case "PRODUCT_APPROVE":
            return "bg-teal-100 text-teal-800 border-teal-300";
         case "PRODUCT_REJECT":
            return "bg-orange-100 text-orange-800 border-orange-300";
         case "PRODUCT_LOCK":
            return "bg-gray-200 text-gray-800 border-gray-400";
         case "SYSTEM_SETTING_UPDATE":
            return "bg-indigo-100 text-indigo-800 border-indigo-300";
         case "CATEGORY_CREATE":
            return "bg-blue-100 text-blue-800 border-blue-300";
         case "CATEGORY_UPDATE":
            return "bg-sky-100 text-sky-800 border-sky-300";
         case "CATEGORY_DELETE":
            return "bg-red-100 text-red-800 border-red-300";
         case "COUPON_CREATE":
            return "bg-violet-100 text-violet-800 border-violet-300";
         case "COUPON_DELETE":
            return "bg-amber-100 text-amber-800 border-amber-300";
         case "PAYOUT_APPROVE":
            return "bg-green-100 text-green-800 border-green-300";
         default:
            return "bg-slate-100 text-slate-800 border-slate-300";
      }
   };

   const getActionName = (action: string) => {
      switch (action) {
         case "SHOP_APPROVE":
            return "Duyệt gian hàng";
         case "SHOP_REJECT":
            return "Từ chối gian hàng";
         case "PRODUCT_APPROVE":
            return "Duyệt sản phẩm";
         case "PRODUCT_REJECT":
            return "Từ chối sản phẩm";
         case "PRODUCT_LOCK":
            return "Khóa sản phẩm";
         case "SYSTEM_SETTING_UPDATE":
            return "Cấu hình hệ thống";
         case "CATEGORY_CREATE":
            return "Tạo danh mục";
         case "CATEGORY_UPDATE":
            return "Cập nhật danh mục";
         case "CATEGORY_DELETE":
            return "Xóa danh mục";
         case "COUPON_CREATE":
            return "Tạo Voucher";
         case "COUPON_DELETE":
            return "Xóa Voucher";
         case "PAYOUT_APPROVE":
            return "Duyệt đối soát";
         default:
            return action;
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
         second: "2-digit",
      });
   };

   const parseJSONDetails = (detailsStr: string) => {
      if (!detailsStr) return null;
      try {
         return JSON.parse(detailsStr);
      } catch (e) {
         return detailsStr;
      }
   };

   return (
      <div className="space-y-8">
         {/* Filters bar */}
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-subtle border-2 border-black">
                     <ClipboardList size={22} />
                  </div>
                  <h1 className="font-serif text-2xl font-black text-black">NHẬT KÝ HỆ THỐNG</h1>
               </div>
               <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  Giám sát các hành động quản trị, thay đổi cấu hình, kiểm duyệt và quản lý gian hàng
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

         {/* Search & Filters form */}
         <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-brutal space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Search input */}
               <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-black">
                     Tìm kiếm từ khóa
                  </label>
                  <div className="relative">
                     <input
                        type="text"
                        placeholder="Mô tả, email, mã..."
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

               {/* Action filter */}
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-black">
                     Loại hành động
                  </label>
                  <select
                     value={actionFilter}
                     onChange={(e) => {
                        setActionFilter(e.target.value);
                        setPage(1);
                     }}
                     className="w-full bg-gray-50 border-2 border-black rounded-xl px-4 py-2.5 font-bold text-xs focus:outline-none text-black"
                  >
                     <option value="">Tất cả hành động</option>
                     <option value="SHOP_APPROVE">Duyệt gian hàng</option>
                     <option value="SHOP_REJECT">Từ chối gian hàng</option>
                     <option value="PRODUCT_APPROVE">Duyệt sản phẩm</option>
                     <option value="PRODUCT_REJECT">Từ chối sản phẩm</option>
                     <option value="PRODUCT_LOCK">Khóa sản phẩm</option>
                     <option value="SYSTEM_SETTING_UPDATE">Cập nhật cấu hình</option>
                     <option value="CATEGORY_CREATE">Tạo danh mục</option>
                     <option value="CATEGORY_UPDATE">Cập nhật danh mục</option>
                     <option value="CATEGORY_DELETE">Xóa danh mục</option>
                     <option value="COUPON_CREATE">Tạo Voucher sàn</option>
                     <option value="COUPON_DELETE">Xóa Voucher sàn</option>
                     <option value="PAYOUT_APPROVE">Duyệt đối soát</option>
                  </select>
               </div>

               {/* Date range from */}
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-black">
                     Từ ngày
                  </label>
                  <div className="relative">
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
               </div>

               {/* Date range to */}
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-black">
                     Đến ngày
                  </label>
                  <div className="relative">
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
            </div>

            {/* Clear filters button */}
            {(searchQuery || actionFilter || fromDate || toDate) && (
               <div className="flex justify-end pt-2">
                  <button
                     onClick={() => {
                        setSearchQuery("");
                        setActionFilter("");
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

         {/* Logs Table */}
         <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-brutal">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b-2 border-black bg-gray-50 text-[10px] font-black uppercase tracking-widest text-black">
                        <th className="p-4 md:p-6 w-48">Thời gian</th>
                        <th className="p-4 md:p-6 w-52">Người thực hiện</th>
                        <th className="p-4 md:p-6 w-44">Hành động</th>
                        <th className="p-4 md:p-6">Chi tiết hoạt động</th>
                        <th className="p-4 md:p-6 w-32 text-center">Tác vụ</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-xs text-black">
                     {loading ? (
                        <tr>
                           <td colSpan={5} className="p-20 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-3">
                                 <Loader2 size={32} className="animate-spin text-black" />
                                 <span className="font-bold">Đang tải nhật ký hệ thống...</span>
                              </div>
                           </td>
                        </tr>
                     ) : logs.length === 0 ? (
                        <tr>
                           <td colSpan={5} className="p-20 text-center text-gray-500 font-bold">
                              Không tìm thấy nhật ký hoạt động nào khớp với bộ lọc
                           </td>
                        </tr>
                     ) : (
                        logs.map((log) => {
                           const userName = log.user?.profile?.full_name || "N/A";
                           return (
                              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="p-4 md:p-6 font-bold whitespace-nowrap text-gray-500">
                                    {formatTime(log.created_at)}
                                 </td>
                                 <td className="p-4 md:p-6">
                                    <div className="flex items-center gap-2">
                                       <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-black border border-black/10 text-black">
                                          <User size={12} />
                                       </div>
                                       <div>
                                          <p className="font-bold line-clamp-1">{userName}</p>
                                          <p className="text-[10px] text-gray-400 line-clamp-1">{log.email || "Khách / N/A"}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-4 md:p-6">
                                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border-2 ${getActionBadge(log.action_type)}`}>
                                       {getActionName(log.action_type)}
                                    </span>
                                 </td>
                                 <td className="p-4 md:p-6">
                                    <p className="font-bold text-black leading-relaxed">{log.description}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                       IP: {log.ip_address || "N/A"} {log.entity_type ? `• Đối tượng: ${log.entity_type} (ID: ${log.entity_id || 'N/A'})` : ''}
                                    </p>
                                 </td>
                                 <td className="p-4 md:p-6 text-center">
                                    <button
                                       onClick={() => setSelectedLog(log)}
                                       className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-black rounded-lg font-black text-[10px] uppercase tracking-wider bg-white hover:bg-black hover:text-white transition-all shadow-subtle active:translate-y-[1px]"
                                       title="Xem chi tiết kỹ thuật"
                                    >
                                       <Eye size={12} /> Chi tiết
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

         {/* Technical Detail Modal */}
         {selectedLog && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white border-4 border-black rounded-3xl w-full max-w-2xl overflow-hidden shadow-brutal animate-in zoom-in-95 duration-150">
                  {/* Modal Header */}
                  <div className="p-6 bg-black text-white flex items-center justify-between border-b-4 border-black">
                     <div className="flex items-center gap-2">
                        <Activity size={20} className="text-red-500" />
                        <h3 className="font-serif text-lg font-black uppercase tracking-wider">Chi tiết kỹ thuật log</h3>
                     </div>
                     <button
                        onClick={() => setSelectedLog(null)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-white"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 border-2 border-black rounded-xl p-3">
                           <p className="text-[10px] text-gray-400 font-bold uppercase">Hành động</p>
                           <p className="text-xs font-black text-black mt-0.5">{getActionName(selectedLog.action_type)} ({selectedLog.action_type})</p>
                        </div>
                        <div className="bg-gray-50 border-2 border-black rounded-xl p-3">
                           <p className="text-[10px] text-gray-400 font-bold uppercase">Thời gian</p>
                           <p className="text-xs font-black text-black mt-0.5">{formatTime(selectedLog.created_at)}</p>
                        </div>
                        <div className="bg-gray-50 border-2 border-black rounded-xl p-3">
                           <p className="text-[10px] text-gray-400 font-bold uppercase">Người thực hiện</p>
                           <p className="text-xs font-black text-black mt-0.5">{selectedLog.user?.profile?.full_name || "N/A"}</p>
                           <p className="text-[10px] text-gray-500 mt-0.5">{selectedLog.email || "Khách / N/A"}</p>
                        </div>
                        <div className="bg-gray-50 border-2 border-black rounded-xl p-3">
                           <p className="text-[10px] text-gray-400 font-bold uppercase">Môi trường</p>
                           <p className="text-xs font-black text-black mt-0.5">IP: {selectedLog.ip_address || "N/A"}</p>
                        </div>
                     </div>

                     {selectedLog.entity_type && (
                        <div className="bg-gray-50 border-2 border-black rounded-xl p-3 flex justify-between items-center">
                           <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">Đối tượng chịu tác động</p>
                              <p className="text-xs font-black text-black mt-0.5">{selectedLog.entity_type}</p>
                           </div>
                           <div className="bg-black text-white px-3 py-1 border-2 border-black rounded-lg text-xs font-black">
                              ID: {selectedLog.entity_id || "N/A"}
                           </div>
                        </div>
                     )}

                     <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Mô tả hoạt động</p>
                        <div className="bg-gray-50 border-2 border-black rounded-xl p-4 font-bold text-xs text-black">
                           {selectedLog.description}
                        </div>
                     </div>

                     {selectedLog.user_agent && (
                        <div>
                           <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Thiết bị (User Agent)</p>
                           <div className="bg-gray-50 border-2 border-black rounded-xl p-3 font-mono text-[10px] text-gray-500 leading-tight">
                              {selectedLog.user_agent}
                           </div>
                        </div>
                     )}

                     <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Dữ liệu thay đổi chi tiết (Details Payload)</p>
                        {selectedLog.details ? (
                           <pre className="bg-gray-900 border-2 border-black rounded-xl p-4 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-60 leading-relaxed">
                              {typeof parseJSONDetails(selectedLog.details) === "object"
                                 ? JSON.stringify(parseJSONDetails(selectedLog.details), null, 2)
                                 : selectedLog.details}
                           </pre>
                        ) : (
                           <div className="bg-gray-50 border-2 border-black rounded-xl p-4 text-xs font-bold text-gray-400 italic text-center">
                              Không có dữ liệu chi tiết bổ sung
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 bg-gray-50 border-t-2 border-black flex justify-end">
                     <button
                        onClick={() => setSelectedLog(null)}
                        className="px-6 py-2.5 border-2 border-black rounded-xl font-black text-xs uppercase tracking-wider bg-white hover:bg-gray-100 active:translate-y-[2px] transition-all shadow-subtle text-black"
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
