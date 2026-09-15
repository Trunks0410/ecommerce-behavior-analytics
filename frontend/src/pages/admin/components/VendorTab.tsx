import { useState, useEffect, useCallback } from 'react';
import {
   RefreshCw,
   Store,
   Loader2,
   Check,
   X,
   AlertTriangle,
   Eye,
} from 'lucide-react';
import { getShopStatusLabel } from '@/shared/utils/statusUtils';
import { adminService } from '@/services/adminService';

interface VendorTabProps {
   showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
   showConfirm: (message: string, onConfirm: () => void) => void;
}

export const VendorTab = ({ showToast, showConfirm }: VendorTabProps) => {
   const [shops, setShops] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [filter, setFilter] = useState<string>("");
   const [rejectModal, setRejectModal] = useState<{ show: boolean; shopId: number | null }>({ show: false, shopId: null });
   const [rejectReason, setRejectReason] = useState("");
   const [selectedShop, setSelectedShop] = useState<any>(null);

   const fetchShops = useCallback(async () => {
      setLoading(true);
      try {
         const res = await adminService.getShops(filter || undefined);
         setShops(res.data || []);
      } catch (e: any) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   }, [filter]);

   useEffect(() => { fetchShops(); }, [fetchShops]);

   const handleApprove = (id: number) => {
      showConfirm("Xác nhận phê duyệt gian hàng này?", async () => {
         try {
            await adminService.approveShop(id);
            showToast("Phê duyệt gian hàng thành công!", "success");
            fetchShops();
         } catch (e: any) {
            showToast(e.response?.data?.message || "Lỗi phê duyệt", "error");
         }
      });
   };

   const handleReject = async () => {
      if (!rejectModal.shopId) return;
      try {
         await adminService.rejectShop(rejectModal.shopId, rejectReason);
         setRejectModal({ show: false, shopId: null });
         setRejectReason("");
         showToast("Từ chối gian hàng thành công!", "success");
         fetchShops();
      } catch (e: any) {
         showToast(e.response?.data?.message || "Lỗi từ chối", "error");
      }
   };

   const statusColors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-600',
      BANNED: 'bg-gray-200 text-gray-600',
   };



   return (
      <div className="space-y-8">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-3xl font-serif font-black tracking-tighter uppercase">Phê duyệt gian hàng Vendor</h1>
               <p className="text-gray-400 font-medium text-sm mt-1 italic">Kiểm soát đầu vào các shop thời trang trên sàn</p>
            </div>
            <button onClick={fetchShops} className="p-3 border-2 border-black rounded-xl hover:bg-gray-50 transition-all active:translate-y-1">
               <RefreshCw size={18} />
            </button>
         </div>

         {/* Filter */}
         <div className="flex gap-3">
            {[
               { value: "", label: "Tất cả" },
               { value: "PENDING", label: "Chờ duyệt" },
               { value: "APPROVED", label: "Đã duyệt" },
               { value: "REJECTED", label: "Từ chối" },
            ].map(f => (
               <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-6 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filter === f.value ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}
               >
                  {f.label}
               </button>
            ))}
         </div>

         {/* Bảng */}
         <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-sm">
            {loading ? (
               <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
               </div>
            ) : shops.length === 0 ? (
               <div className="text-center py-20">
                  <Store size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Không có gian hàng nào</p>
               </div>
            ) : (
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b-2 border-black/5 bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <th className="px-8 py-6">Tên gian hàng</th>
                        <th className="px-8 py-6">Chủ shop (Vendor)</th>
                        <th className="px-8 py-6">Trạng thái</th>
                        <th className="px-8 py-6">Ngày đăng ký</th>
                        <th className="px-8 py-6 text-right">Thao tác</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/5">
                     {shops.map((s: any) => (
                        <tr key={s.id} className="hover:bg-red-50/30 transition-colors">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-gray-100 border-2 border-black/10 flex items-center justify-center overflow-hidden">
                                    {s.shop_logo ? <img src={s.shop_logo} alt="" className="w-full h-full object-cover" /> : <Store size={18} className="text-gray-400" />}
                                 </div>
                                 <span className="text-sm font-black">{s.shop_name}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <p className="text-xs font-bold">{s.vendor?.profile?.full_name || "N/A"}</p>
                              <p className="text-[10px] text-gray-400">{s.vendor?.email}</p>
                           </td>
                           <td className="px-8 py-6">
                              <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border-2 border-black ${statusColors[s.status] || 'bg-gray-100'}`}>
                                 {getShopStatusLabel(s.status)}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-xs font-bold text-gray-400">
                              {new Date(s.created_at).toLocaleDateString("vi-VN")}
                           </td>
                           <td className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-3">
                                 <button onClick={() => setSelectedShop(s)} className="p-2.5 border-2 border-black rounded-xl text-gray-600 hover:bg-gray-100 transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" title="Xem chi tiết">
                                    <Eye size={14} />
                                 </button>
                                 {s.status === 'PENDING' && (
                                    <>
                                       <button onClick={() => handleApprove(s.id)} className="p-2.5 border-2 border-black rounded-xl text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" title="Phê duyệt">
                                          <Check size={14} />
                                       </button>
                                       <button onClick={() => setRejectModal({ show: true, shopId: s.id })} className="p-2.5 border-2 border-black rounded-xl text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" title="Từ chối">
                                          <X size={14} />
                                       </button>
                                    </>
                                 )}
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>

         {/* Modal chi tiết Vendor */}
         {selectedShop && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedShop(null)}>
               <div className="bg-white border-[3px] border-black rounded-[2rem] p-8 max-w-lg w-full shadow-brutal relative max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedShop(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                     <X size={20} />
                  </button>
                  <h3 className="text-2xl font-serif font-black tracking-tighter uppercase mb-6 border-b-2 border-black pb-4 text-center text-black">Chi tiết Gian hàng</h3>

                  {/* Thông tin shop */}
                  <div className="flex flex-col items-center mb-6">
                     <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-3xl border-4 border-black overflow-hidden shadow-subtle mb-4">
                        {selectedShop.shop_logo ? (
                           <img src={selectedShop.shop_logo} alt="shop logo" className="w-full h-full object-cover" />
                        ) : (
                           <Store size={32} className="text-gray-400" />
                        )}
                     </div>
                     <h4 className="text-xl font-black uppercase text-black">{selectedShop.shop_name}</h4>
                     <span className={`mt-2 text-[9px] font-black uppercase px-3 py-1.5 rounded-full border-2 border-black ${statusColors[selectedShop.status] || 'bg-gray-100'}`}>
                        {getShopStatusLabel(selectedShop.status)}
                     </span>
                  </div>

                  <div className="space-y-4 text-black">
                     <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                        <span className="text-xs font-black uppercase text-gray-400">Chủ shop</span>
                        <span className="text-sm font-bold">{selectedShop.vendor?.profile?.full_name || "Chưa cập nhật"}</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                        <span className="text-xs font-black uppercase text-gray-400">Email</span>
                        <span className="text-sm font-bold">{selectedShop.vendor?.email || "Trống"}</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                        <span className="text-xs font-black uppercase text-gray-400">Mô tả</span>
                        <span className="text-sm font-bold truncate max-w-[250px]" title={selectedShop.description}>{selectedShop.description || "Trống"}</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                        <span className="text-xs font-black uppercase text-gray-400">Ngày đăng ký</span>
                        <span className="text-sm font-bold">{new Date(selectedShop.created_at).toLocaleDateString("vi-VN")}</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                        <span className="text-xs font-black uppercase text-gray-400">Đánh giá</span>
                        <span className="text-sm font-bold">⭐ {selectedShop.rating || "0.00"}</span>
                     </div>
                  </div>


                  {/* Nút duyệt / từ chối nếu PENDING */}
                  {selectedShop.status === 'PENDING' && (
                     <div className="flex gap-4 mt-6">
                        <button
                           onClick={() => { handleApprove(selectedShop.id); setSelectedShop(null); }}
                           className="flex-grow py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-green-600 text-white hover:bg-green-700 transition-all shadow-subtle active:translate-y-[2px] flex items-center justify-center gap-2"
                        >
                           <Check size={14} /> Phê duyệt
                        </button>
                        <button
                           onClick={() => { setRejectModal({ show: true, shopId: selectedShop.id }); setSelectedShop(null); }}
                           className="flex-grow py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-subtle active:translate-y-[2px] flex items-center justify-center gap-2"
                        >
                           <X size={14} /> Từ chối
                        </button>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* Modal từ chối */}
         {rejectModal.show && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setRejectModal({ show: false, shopId: null })}>
               <div className="bg-white border-2 border-black rounded-[2rem] p-8 w-full max-w-lg shadow-brutal" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                     <AlertTriangle className="text-red-500" size={24} /> Từ chối gian hàng
                  </h3>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Lý do từ chối *</label>
                  <textarea
                     value={rejectReason}
                     onChange={e => setRejectReason(e.target.value)}
                     rows={4}
                     placeholder="Nhập lý do từ chối cụ thể để shop biết và sửa lại..."
                     className="w-full border-2 border-black rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 resize-none mb-6"
                  />
                  <div className="flex gap-4">
                     <button onClick={handleReject} className="px-8 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-subtle active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                        Xác nhận từ chối
                     </button>
                     <button onClick={() => setRejectModal({ show: false, shopId: null })} className="px-8 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">
                        Hủy
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
