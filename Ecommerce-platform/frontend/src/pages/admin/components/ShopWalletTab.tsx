import { useState, useEffect, useCallback } from 'react';
import {
   RefreshCw,
   Store,
   Loader2,
   CheckCircle2,
   Clock,
   Wallet,
   Search,
   DollarSign,
   Percent,
   Truck,
} from 'lucide-react';
import { adminService } from '@/services/adminService';

interface ShopWalletTabProps {
   showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
   showConfirm: (message: string, onConfirm: () => void) => void;
}

export const ShopWalletTab = ({ showToast, showConfirm }: ShopWalletTabProps) => {
   const [wallets, setWallets] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState("");

   const fetchData = useCallback(async () => {
      setLoading(true);
      try {
         const res = await adminService.getShopWallets();
         setWallets(res.data || []);
      } catch (e: any) {
         console.error(e);
         showToast(e.response?.data?.message || "Lỗi tải thông tin ví shop", "error");
      } finally {
         setLoading(false);
      }
   }, [showToast]);

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const handleDisburse = (shopId: number | string, shopName: string, amount: number) => {
      showConfirm(`Bạn có chắc chắn muốn giải ngân ${fmt(amount)}₫ số dư đóng băng cho shop "${shopName}"? Số tiền này sẽ được chuyển thành số dư khả dụng và shop có thể rút về ngân hàng.`, async () => {
         try {
            await adminService.disburseShopWallet(shopId);
            showToast(`Giải ngân thành công cho shop "${shopName}"!`, "success");
            fetchData();
         } catch (e: any) {
            showToast(e.response?.data?.message || "Lỗi giải ngân ví shop", "error");
         }
      });
   };

   const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0));

   const filteredWallets = wallets.filter(w =>
      w.shop_name.toLowerCase().includes(searchTerm.toLowerCase())
   );

   // Summary stats
   const totalShops = wallets.length;
   const totalOrders = wallets.reduce((s, w) => s + (w.order_count || 0), 0);
   const totalRevenue = wallets.reduce((s, w) => s + (w.total_revenue || 0), 0);
   const totalPending = wallets.reduce((s, w) => s + (w.pending_balance || 0), 0);
   const totalAvailable = wallets.reduce((s, w) => s + (w.available_balance || 0), 0);

   return (
      <div className="space-y-8 text-left">
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <div>
               <h1 className="text-3xl font-serif font-black tracking-tighter uppercase">Quản lý ví & tiền Shop</h1>
               <p className="text-gray-400 font-medium text-sm mt-1 italic">
                  Kiểm soát dòng tiền tạm giữ, phí ship, chiết khấu và giải ngân doanh thu cho từng gian hàng
               </p>
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
               <div className="relative flex-grow lg:flex-grow-0 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                     type="text"
                     placeholder="Tìm tên shop..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full bg-white border-2 border-black pl-10 pr-4 py-2 rounded-xl text-xs font-bold focus:outline-none transition-all focus:ring-4 focus:ring-primary/10"
                  />
               </div>
               <button
                  onClick={fetchData}
                  className="p-3 border-2 border-black rounded-xl hover:bg-gray-50 transition-all active:translate-y-1 bg-white shrink-0"
               >
                  <RefreshCw size={18} />
               </button>
            </div>
         </div>

         {/* Summary Cards */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
               { label: "Tổng số shop", value: totalShops, icon: <Store className="text-purple-500" /> },
               { label: "Tổng đơn hoàn tất", value: totalOrders, icon: <CheckCircle2 className="text-blue-500" /> },
               { label: "Doanh thu tạm giữ", value: `${fmt(totalPending)}₫`, icon: <Clock className="text-amber-500" /> },
               { label: "Số dư khả dụng", value: `${fmt(totalAvailable)}₫`, icon: <Wallet className="text-green-500" /> },
            ].map((s, i) => (
               <div key={i} className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm flex items-center gap-4 group hover:shadow-brutal transition-all cursor-default">
                  <div className="w-12 h-12 bg-gray-50 border-2 border-black/5 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shrink-0">{s.icon}</div>
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
                     <p className="text-xl font-black tracking-tighter leading-none">{s.value}</p>
                  </div>
               </div>
            ))}
         </div>

         {/* Wallets Table */}
         <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-sm">
            {loading ? (
               <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
               </div>
            ) : filteredWallets.length === 0 ? (
               <div className="text-center py-20">
                  <Store size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Không tìm thấy gian hàng nào</p>
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="border-b-2 border-black/5 bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                           <th className="px-6 py-5">Gian hàng</th>
                           <th className="px-6 py-5 text-center">Đơn hàng</th>
                           <th className="px-6 py-5 text-right">Tổng thu hộ</th>
                           <th className="px-6 py-5 text-right">Trừ phí ship (30k/đơn)</th>
                           <th className="px-6 py-5 text-right">Tạm giữ (Đóng băng)</th>
                           <th className="px-6 py-5 text-right">Khả dụng (Ví shop)</th>
                           <th className="px-6 py-5 text-center">Trạng thái giải ngân</th>
                           <th className="px-6 py-5 text-center">Thao tác</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y-2 divide-black/5">
                        {filteredWallets.map((wallet) => {
                           const isPending = wallet.pending_balance > 0;
                           const hasOrders = wallet.order_count > 0;
                           
                           return (
                              <tr key={wallet.shop_id} className="hover:bg-red-50/30 transition-colors">
                                 <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                       <div className="w-9 h-9 rounded-xl bg-gray-100 border-2 border-black/10 flex items-center justify-center overflow-hidden shrink-0">
                                          {wallet.shop_logo ? <img src={wallet.shop_logo} alt="" className="w-full h-full object-cover" /> : <Store size={16} className="text-gray-400" />}
                                       </div>
                                       <div>
                                          <p className="text-sm font-black text-black">{wallet.shop_name}</p>
                                          <p className="text-[9px] text-gray-400 font-bold font-mono">ID: #{wallet.shop_id}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-5 text-center font-bold text-gray-700">
                                    {wallet.order_count}
                                 </td>
                                 <td className="px-6 py-5 text-right font-black text-black">
                                    {fmt(wallet.total_revenue)}₫
                                 </td>
                                 <td className="px-6 py-5 text-right font-bold text-red-500">
                                    -{fmt(wallet.total_shipping_fee)}₫
                                 </td>
                                 <td className="px-6 py-5 text-right font-black text-amber-600">
                                    {fmt(wallet.pending_balance)}₫
                                 </td>
                                 <td className="px-6 py-5 text-right font-black text-green-600">
                                    {fmt(wallet.available_balance)}₫
                                 </td>
                                 <td className="px-6 py-5 text-center">
                                    {isPending ? (
                                       <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border-2 border-black bg-amber-100 text-amber-800">
                                          <Clock size={10} /> Chờ giải ngân
                                       </span>
                                    ) : hasOrders ? (
                                       <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border-2 border-black bg-green-100 text-green-800">
                                          <CheckCircle2 size={10} /> Đã giải ngân
                                       </span>
                                    ) : (
                                       <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border-2 border-black bg-gray-100 text-gray-400">
                                          Không giao dịch
                                       </span>
                                    )}
                                 </td>
                                 <td className="px-6 py-5 text-center">
                                    <button
                                       disabled={!isPending}
                                       onClick={() => handleDisburse(wallet.shop_id, wallet.shop_name, wallet.pending_balance)}
                                       className={`px-3 py-2 border-2 border-black rounded-xl font-black text-[9px] uppercase tracking-widest bg-primary text-black hover:bg-black hover:text-white transition-all shadow-subtle active:translate-y-[1px] disabled:opacity-30 disabled:pointer-events-none`}
                                    >
                                       Giải ngân
                                    </button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>
   );
};
