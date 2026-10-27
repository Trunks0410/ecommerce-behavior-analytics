import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
   BarChart3,
   TrendingUp,
   TrendingDown,
   Store,
   Download,
   Loader2,
   RefreshCw,
   Wallet,
   Package,
   Info,
} from 'lucide-react';
import { managerService } from '@/services/managerService';
import * as XLSX from 'xlsx';

export const ReportTab = () => {
   const [reportData, setReportData] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [subTab, setSubTab] = useState<'shops' | 'best_sellers' | 'slow_sellers' | 'categories'>('shops');

   const [shopMonth, setShopMonth] = useState<number>(new Date().getMonth() + 1);
   const [shopYear, setShopYear] = useState<number>(new Date().getFullYear());

   const [bestMonth, setBestMonth] = useState<number>(new Date().getMonth() + 1);
   const [bestYear, setBestYear] = useState<number>(new Date().getFullYear());

   const [slowMonth, setSlowMonth] = useState<number>(new Date().getMonth() + 1);
   const [slowYear, setSlowYear] = useState<number>(new Date().getFullYear());

   const [catMonth, setCatMonth] = useState<number>(new Date().getMonth() + 1);
   const [catYear, setCatYear] = useState<number>(new Date().getFullYear());

   const getActiveFilters = useCallback(() => {
      if (subTab === 'shops') return { month: shopMonth, year: shopYear };
      if (subTab === 'best_sellers') return { month: bestMonth, year: bestYear };
      if (subTab === 'slow_sellers') return { month: slowMonth, year: slowYear };
      return { month: catMonth, year: catYear };
   }, [subTab, shopMonth, shopYear, bestMonth, bestYear, slowMonth, slowYear, catMonth, catYear]);

   const hasLoadedRef = useRef(false);

   const fetchReportData = useCallback(async () => {
      if (!hasLoadedRef.current) {
         setLoading(true);
      } else {
         setIsRefreshing(true);
      }
      try {
         const filters = getActiveFilters();
         const data = await managerService.getReportOverview(filters.month, filters.year);
         setReportData(data);
         hasLoadedRef.current = true;
      } catch (error) {
         console.error('Lỗi tải dữ liệu báo cáo:', error);
      } finally {
         setLoading(false);
         setIsRefreshing(false);
      }
   }, [getActiveFilters]);

   useEffect(() => {
      fetchReportData();
   }, [fetchReportData]);

   const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0));

   const handleExportExcel = () => {
      if (!reportData) return;

      try {
         // Sheet 1: Doanh thu cửa hàng
         const shopSheetData = reportData.shopReports.map((shop: any) => ({
            "Mã Shop": shop.shop_id,
            "Tên Cửa Hàng": shop.shop_name,
            "Người Đại Diện": shop.vendor_name,
            "Email Liên Hệ": shop.vendor_email,
            "Số Đơn Hàng Thành Công": shop.order_count,
            "Doanh Thu Gộp (đ)": shop.gross_revenue,
            "Phí Hoa Hồng Thu Về (đ)": shop.commission_amount,
            "Doanh Thu Ròng (đ)": shop.net_revenue,
            "Tiền Đã Rút (đ)": shop.paid_payout,
            "Tiền Đang Chờ Duyệt (đ)": shop.pending_payout,
            "Số Dư Khả Dụng Có Thể Rút (đ)": shop.available_balance
         }));

         // Sheet 2: Sản phẩm bán chạy
         const bestSellersSheetData = reportData.bestSellers.map((prod: any) => ({
            "Mã Sản Phẩm": prod.product_id,
            "Tên Sản Phẩm": prod.product_name,
            "Tên Cửa Hàng": prod.shop_name,
            "Danh Mục": prod.category_name,
            "Số Lượng Đã Bán": prod.total_sold,
            "Đơn Giá Trung Bình (đ)": prod.avg_price,
            "Doanh Thu Mang Lại (đ)": prod.total_revenue
         }));

         // Sheet 3: Sản phẩm bán ế
         const slowSellersSheetData = reportData.slowSellers.map((prod: any) => ({
            "Mã Sản Phẩm": prod.product_id,
            "Tên Sản Phẩm": prod.product_name,
            "Tên Cửa Hàng": prod.shop_name,
            "Danh Mục": prod.category_name,
            "Số Lượng Đã Bán": prod.total_sold,
            "Số Lượng Tồn Kho": prod.stock_quantity,
            "Ngày Đăng Bán": new Date(prod.created_at).toLocaleDateString("vi-VN")
         }));

         // Sheet 4: Doanh thu theo danh mục
         const categoriesSheetData = reportData.categoryRevenues ? reportData.categoryRevenues.map((cat: any) => ({
            "Tên Danh Mục": cat.category_name,
            "Số Lượng Đã Bán": cat.units_sold,
            "Doanh Thu Mang Lại (đ)": cat.total_revenue
         })) : [];

         // Tạo Workbook
         const wb = XLSX.utils.book_new();

         // Thêm Sheet 1
         const ws1 = XLSX.utils.json_to_sheet(shopSheetData);
         XLSX.utils.book_append_sheet(wb, ws1, "Doanh Thu Cửa Hàng");

         // Thêm Sheet 2
         const ws2 = XLSX.utils.json_to_sheet(bestSellersSheetData);
         XLSX.utils.book_append_sheet(wb, ws2, "Sản Phẩm Bán Chạy");

         // Thêm Sheet 3
         const ws3 = XLSX.utils.json_to_sheet(slowSellersSheetData);
         XLSX.utils.book_append_sheet(wb, ws3, "Sản Phẩm Bán Ế");

         // Thêm Sheet 4
         if (categoriesSheetData.length > 0) {
            const ws4 = XLSX.utils.json_to_sheet(categoriesSheetData);
            XLSX.utils.book_append_sheet(wb, ws4, "Doanh Thu Theo Danh Mục");
         }

         // Tải file xuống
         const fileName = `Bao_cao_tong_quan_uteshop_${new Date().toISOString().slice(0, 10)}.xlsx`;
         XLSX.writeFile(wb, fileName);
      } catch (err) {
         console.error('Lỗi xuất file excel:', err);
         alert('Có lỗi xảy ra khi xuất báo cáo ra Excel');
      }
   };

   return (
      <div className="space-y-8 animate-in fade-in duration-200">
         {/* Top Header */}
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 border-b border-gray-200 pb-4">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-subtle border-2 border-black">
                     <BarChart3 size={22} />
                  </div>
                  <h1 className="font-serif text-3xl font-black text-black">BÁO CÁO THỐNG KÊ QUẢN TRỊ</h1>
               </div>
               <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                  Phân tích doanh thu, hàng bán chạy, hàng tồn đọng và quản trị tài chính ví gian hàng toàn sàn
               </p>
            </div>

            <div className="flex gap-3">
               <button
                  onClick={fetchReportData}
                  className="flex items-center justify-center p-3 border-2 border-black rounded-xl bg-white hover:bg-gray-50 active:translate-y-[2px] transition-all shadow-subtle text-black"
                  title="Tải lại số liệu"
               >
                  <RefreshCw size={16} />
               </button>
               <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-wider bg-black text-white hover:bg-primary active:translate-y-[2px] transition-all shadow-subtle"
               >
                  <Download size={16} /> Xuất Báo Cáo Excel
               </button>
            </div>
         </div>

         {/* Overall Widget Card */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Widget 1: Available balance waiting for withdrawal */}
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-brutal flex items-center justify-between">
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số tiền khả dụng đang chờ shop rút</span>
                  <h2 className="text-3xl font-black text-black leading-none">
                     {reportData ? `${fmt(reportData.totalAvailableWaitingForWithdraw)}₫` : '...'}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Là tổng số dư có thể rút của toàn bộ các shop hoạt động bình thường</p>
               </div>
               <div className="w-14 h-14 bg-red-100 text-red-600 border-2 border-black rounded-2xl flex items-center justify-center shadow-subtle shrink-0">
                  <Wallet size={28} />
               </div>
            </div>

            {/* Widget 2: Platform Total Shops */}
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-brutal flex items-center justify-between">
               <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng số gian hàng báo cáo</span>
                  <h2 className="text-3xl font-black text-black leading-none">
                     {reportData ? `${reportData.shopReports?.length || 0} Shop` : '...'}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Các cửa hàng được phê duyệt hoạt động hoặc tạm dừng trên nền tảng</p>
               </div>
               <div className="w-14 h-14 bg-blue-100 text-blue-600 border-2 border-black rounded-2xl flex items-center justify-center shadow-subtle shrink-0">
                  <Store size={28} />
               </div>
            </div>
         </div>

         {/* Navigation Tabs */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-black pb-3">
            <div className="flex flex-wrap gap-2">
               {[
                  { id: 'shops', label: 'Doanh Thu Cửa Hàng', icon: <Store size={14} /> },
                  { id: 'best_sellers', label: 'Sản Phẩm Bán Chạy', icon: <TrendingUp size={14} /> },
                  { id: 'slow_sellers', label: 'Sản Phẩm Bán Ế (Tồn Đọng)', icon: <TrendingDown size={14} /> },
                  { id: 'categories', label: 'Doanh Thu Theo Danh Mục', icon: <BarChart3 size={14} /> }
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setSubTab(tab.id as any)}
                     className={`px-5 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all ${subTab === tab.id ? 'bg-black text-white shadow-subtle translate-y-[2px]' : 'bg-white hover:bg-gray-50 text-black'}`}
                  >
                     {tab.icon}
                     {tab.label}
                  </button>
               ))}
            </div>

            {/* Tab-Specific Month/Year Filters */}
            <div className="flex items-center gap-3 bg-white border-2 border-black rounded-2xl px-4 py-2 shadow-subtle select-none">
               <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase text-gray-400">Tháng</span>
                  <select
                     value={
                        subTab === 'shops' ? shopMonth :
                        subTab === 'best_sellers' ? bestMonth :
                        subTab === 'slow_sellers' ? slowMonth : catMonth
                     }
                     onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (subTab === 'shops') setShopMonth(val);
                        else if (subTab === 'best_sellers') setBestMonth(val);
                        else if (subTab === 'slow_sellers') setSlowMonth(val);
                        else setCatMonth(val);
                     }}
                     className="border border-black rounded-lg px-2 py-1 font-bold text-xs bg-white text-black focus:outline-none"
                  >
                     {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>Tháng {m}</option>
                     ))}
                  </select>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase text-gray-400">Năm</span>
                  <select
                     value={
                        subTab === 'shops' ? shopYear :
                        subTab === 'best_sellers' ? bestYear :
                        subTab === 'slow_sellers' ? slowYear : catYear
                     }
                     onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (subTab === 'shops') setShopYear(val);
                        else if (subTab === 'best_sellers') setBestYear(val);
                        else if (subTab === 'slow_sellers') setSlowYear(val);
                        else setCatYear(val);
                     }}
                     className="border border-black rounded-lg px-2 py-1 font-bold text-xs bg-white text-black focus:outline-none"
                  >
                     {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>Năm {y}</option>
                     ))}
                  </select>
               </div>
            </div>
         </div>

         {/* Sub-tab Content Area */}
         <div className={`bg-white border-2 border-black rounded-3xl overflow-hidden shadow-brutal transition-all duration-200 ${isRefreshing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {!reportData && loading ? (
               <div className="flex flex-col items-center justify-center py-24 bg-white">
                  <Loader2 className="animate-spin text-primary mb-4" size={36} />
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">Đang tính toán số liệu thống kê...</p>
               </div>
            ) : (
               <>
                  {subTab === 'shops' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="border-b-2 border-black bg-gray-50 text-[10px] font-black uppercase tracking-widest text-black">
                                 <th className="p-4 md:p-6">Tên Cửa Hàng</th>
                                 <th className="p-4 md:p-6 w-28 text-center">Số Đơn Hàng</th>
                                 <th className="p-4 md:p-6 text-right">Doanh Thu Gộp</th>
                                 <th className="p-4 md:p-6 text-right">Hoa Hồng Sàn</th>
                                 <th className="p-4 md:p-6 text-right">Doanh Thu Ròng</th>
                                 <th className="p-4 md:p-6 text-right">Đã Rút Tiền</th>
                                 <th className="p-4 md:p-6 text-right">Tiền Đang Chờ Duyệt</th>
                                 <th className="p-4 md:p-6 text-right bg-red-50/50">Số Dư Khả Dụng</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-black/5 text-xs text-black font-bold">
                              {reportData?.shopReports?.map((shop: any) => (
                                 <tr key={shop.shop_id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 md:p-6">
                                       <div>
                                          <p className="font-black text-black uppercase">{shop.shop_name}</p>
                                          <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Vendor: {shop.vendor_name} ({shop.vendor_email})</p>
                                       </div>
                                    </td>
                                    <td className="p-4 md:p-6 text-center">{shop.order_count}</td>
                                    <td className="p-4 md:p-6 text-right">{fmt(shop.gross_revenue)}₫</td>
                                    <td className="p-4 md:p-6 text-right text-purple-700">{fmt(shop.commission_amount)}₫</td>
                                    <td className="p-4 md:p-6 text-right text-gray-600">{fmt(shop.net_revenue)}₫</td>
                                    <td className="p-4 md:p-6 text-right text-green-700">{fmt(shop.paid_payout)}₫</td>
                                    <td className="p-4 md:p-6 text-right text-blue-700">{fmt(shop.pending_payout)}₫</td>
                                    <td className="p-4 md:p-6 text-right bg-red-50/30 text-red-600 font-extrabold">{fmt(shop.available_balance)}₫</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}

                  {subTab === 'best_sellers' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="border-b-2 border-black bg-gray-50 text-[10px] font-black uppercase tracking-widest text-black">
                                 <th className="p-4 md:p-6">Sản phẩm</th>
                                 <th className="p-4 md:p-6 w-52">Cửa hàng</th>
                                 <th className="p-4 md:p-6 w-44">Danh mục</th>
                                 <th className="p-4 md:p-6 w-32 text-center">Số lượng bán</th>
                                 <th className="p-4 md:p-6 text-right w-40">Giá bán trung bình</th>
                                 <th className="p-4 md:p-6 text-right w-44">Doanh thu mang lại</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-black/5 text-xs text-black font-bold">
                              {reportData?.bestSellers?.map((prod: any, idx: number) => (
                                 <tr key={prod.product_id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 md:p-6">
                                       <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 bg-black text-white text-[9px] font-black rounded-md flex items-center justify-center shrink-0">
                                             {idx + 1}
                                          </span>
                                          <p className="font-black text-black leading-relaxed line-clamp-1">{prod.product_name}</p>
                                       </div>
                                    </td>
                                    <td className="p-4 md:p-6 text-gray-500 uppercase">{prod.shop_name}</td>
                                    <td className="p-4 md:p-6 text-gray-400">{prod.category_name}</td>
                                    <td className="p-4 md:p-6 text-center text-primary font-black text-sm">{prod.total_sold}</td>
                                    <td className="p-4 md:p-6 text-right">{fmt(prod.avg_price)}₫</td>
                                    <td className="p-4 md:p-6 text-right text-emerald-700 font-extrabold">{fmt(prod.total_revenue)}₫</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}

                  {subTab === 'slow_sellers' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="border-b-2 border-black bg-gray-50 text-[10px] font-black uppercase tracking-widest text-black">
                                 <th className="p-4 md:p-6">Sản phẩm</th>
                                 <th className="p-4 md:p-6 w-52">Cửa hàng</th>
                                 <th className="p-4 md:p-6 w-44">Danh mục</th>
                                 <th className="p-4 md:p-6 w-32 text-center">Đã bán</th>
                                 <th className="p-4 md:p-6 w-32 text-center bg-amber-50/50">Tồn kho hiện tại</th>
                                 <th className="p-4 md:p-6 w-36 text-center">Ngày đăng bán</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-black/5 text-xs text-black font-bold">
                              {reportData?.slowSellers?.map((prod: any) => (
                                 <tr key={prod.product_id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 md:p-6">
                                       <p className="font-black text-black leading-relaxed line-clamp-1">{prod.product_name}</p>
                                    </td>
                                    <td className="p-4 md:p-6 text-gray-500 uppercase">{prod.shop_name}</td>
                                    <td className="p-4 md:p-6 text-gray-400">{prod.category_name}</td>
                                    <td className="p-4 md:p-6 text-center text-red-600 font-black">{prod.total_sold}</td>
                                    <td className="p-4 md:p-6 text-center bg-amber-50/30 text-amber-700 font-black">{prod.stock_quantity}</td>
                                    <td className="p-4 md:p-6 text-center text-gray-400">
                                       {new Date(prod.created_at).toLocaleDateString("vi-VN")}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}

                  {subTab === 'categories' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="border-b-2 border-black bg-gray-50 text-[10px] font-black uppercase tracking-widest text-black">
                                 <th className="p-4 md:p-6">Tên Danh Mục</th>
                                 <th className="p-4 md:p-6 w-32 text-center">Số Lượng Đã Bán</th>
                                 <th className="p-4 md:p-6 text-right w-44">Doanh Thu Mang Lại</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-black/5 text-xs text-black font-bold">
                              {reportData?.categoryRevenues?.length > 0 ? (
                                 reportData.categoryRevenues.map((cat: any) => (
                                    <tr key={cat.category_name} className="hover:bg-gray-50/50 transition-colors">
                                       <td className="p-4 md:p-6 font-black text-black uppercase">{cat.category_name}</td>
                                       <td className="p-4 md:p-6 text-center text-primary font-black text-sm">{cat.units_sold}</td>
                                       <td className="p-4 md:p-6 text-right text-emerald-700 font-extrabold">{fmt(cat.total_revenue)}₫</td>
                                    </tr>
                                 ))
                              ) : (
                                 <tr>
                                    <td colSpan={3} className="p-6 text-center text-gray-400">Không có dữ liệu danh mục</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  )}
               </>
            )}
         </div>
      </div>
   );
};
