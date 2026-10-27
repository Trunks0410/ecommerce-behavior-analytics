import { useState, useEffect, useCallback } from 'react';
import {
   RefreshCw,
   FileDown,
   TrendingUp,
   DollarSign,
   ArrowUpRight,
   Activity,
   Truck,
   CreditCard,
   ArrowDownRight,
   BarChart3,
   Store,
   Gift,
   Loader2,
} from 'lucide-react';
import { getOrderStatusLabel, getShipmentStatusLabel } from '@/shared/utils/statusUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { adminService } from '@/services/adminService';

const getDefaultDates = () => {
   const today = new Date();
   const y = today.getFullYear();
   const m = today.getMonth();
   const lastDay = new Date(y, m + 1, 0).getDate();
   const fStr = `${y}-${(m + 1).toString().padStart(2, '0')}-01`;
   const lStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
   return { from: fStr, to: lStr, group: "week" as const };
};

export const FinanceTab = () => {
   const def = getDefaultDates();
   const [report, setReport] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [dateFrom, setDateFrom] = useState(def.from);
   const [dateTo, setDateTo] = useState(def.to);
   const [groupBy, setGroupBy] = useState<"day" | "week" | "month">(def.group);
   const [shopMonth, setShopMonth] = useState<number>(new Date().getMonth() + 1);
   const [shopYear, setShopYear] = useState<number>(new Date().getFullYear());
 
   const fetchReport = useCallback(async () => {
      setLoading(true);
      try {
         const res = await adminService.getFinancialReport(
            dateFrom || undefined, 
            dateTo || undefined,
            groupBy,
            shopMonth,
            shopYear
         );
         setReport(res.data);
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   }, [dateFrom, dateTo, groupBy, shopMonth, shopYear]);
 
   useEffect(() => { fetchReport(); }, [fetchReport]);

   const autoAdjustGroupBy = (fromVal: string, toVal: string) => {
      if (!fromVal || !toVal) {
         setGroupBy("day");
         return;
      }
      const start = new Date(fromVal);
      const end = new Date(toVal);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 10) {
         setGroupBy("day");
      } else if (diffDays <= 31) {
         setGroupBy("week"); // Chọn tháng thì chuyển sang tuần
      } else {
         setGroupBy("month"); // Chọn năm thì chuyển sang tháng
      }
   };

   const handleDateFromChange = (val: string) => {
      setDateFrom(val);
      autoAdjustGroupBy(val, dateTo);
   };

   const handleDateToChange = (val: string) => {
      setDateTo(val);
      autoAdjustGroupBy(dateFrom, val);
   };

   const handleReset = () => {
      const defDates = getDefaultDates();
      setDateFrom(defDates.from);
      setDateTo(defDates.to);
      setGroupBy(defDates.group);
      setShopMonth(new Date().getMonth() + 1);
      setShopYear(new Date().getFullYear());
   };

   const handleChartGroupChange = (mode: "day" | "week" | "month") => {
      const today = new Date();
      const y = today.getFullYear();
      const m = today.getMonth();

      if (mode === "day") {
         const start = new Date(today);
         start.setDate(today.getDate() - 6);
         setDateFrom(start.toISOString().split('T')[0]);
         setDateTo(today.toISOString().split('T')[0]);
         setGroupBy("day");
      } else if (mode === "week") {
         const lastDay = new Date(y, m + 1, 0).getDate();
         setDateFrom(`${y}-${(m + 1).toString().padStart(2, '0')}-01`);
         setDateTo(`${y}-${(m + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`);
         setGroupBy("week");
      } else if (mode === "month") {
         setDateFrom(`${y}-01-01`);
         setDateTo(`${y}-12-31`);
         setGroupBy("month");
      }
   };

   const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0));

   const handleExportExcel = () => {
      if (!report) return;

      // 1. Sheet 1: Tổng quan
      const overviewData = [
         ["BÁO CÁO TÀI CHÍNH TỔNG HỢP"],
         ["Thời gian:", `${dateFrom || "Tất cả thời gian"} - ${dateTo || "Hiện tại"}`],
         [],
         ["Chỉ số tổng quan", "Giá trị"],
         ["Tổng doanh thu", report.summary.total_revenue],
         ["Lợi nhuận sàn", report.summary.platform_profit],
         ["Tổng tiền trả Shop", report.summary.total_shop_payout],
         ["Tổng đơn hàng hoàn thành (DELIVERED)", report.summary.total_orders],
      ];
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);

      // 2. Sheet 2: Chi tiết dòng tiền
      const cashflowData = [
         ["BẢNG CHI TIẾT DÒNG TIỀN"],
         [],
         ["Khoản mục", "Thanh toán COD", "Thẻ trực tuyến", "Tổng cộng"],
         ["Doanh thu gốc", report.cod.revenue, report.online.revenue, report.summary.total_revenue],
         [`(-) Chiết khấu sàn (${report.rates.commission_rate}%)`, -report.cod.commission, -report.online.commission, -report.summary.total_commission],
         [`(-) Phí cổng thanh toán (${report.rates.gateway_fee}%)`, 0, -report.online.gateway_fee, -report.summary.total_gateway_fee],
         [`(-) Thuế (${report.rates.tax_rate}%)`, -report.cod.tax, -report.online.tax, -report.summary.total_tax],
         ["(=) Chuyển trả Shop", report.cod.shop_payout, report.online.shop_payout, report.summary.total_shop_payout],
         ["Số đơn hàng", report.cod.order_count, report.online.order_count, report.summary.total_orders]
      ];
      const wsCashflow = XLSX.utils.aoa_to_sheet(cashflowData);

      // 3. Sheet 3: Top Cửa hàng
      const topShopsData = [
         ["TOP CỬA HÀNG DOANH THU CAO"],
         [],
         ["Thứ hạng", "Tên Shop", "Số lượng đơn hàng", "Tổng doanh thu"]
      ];
      (report.top_shops || []).forEach((shop: any, idx: number) => {
         topShopsData.push([
            idx + 1,
            shop.shop_name,
            shop.order_count,
            shop.total_revenue
         ]);
      });
      const wsTopShops = XLSX.utils.aoa_to_sheet(topShopsData);

      // 4. Sheet 4: Doanh thu theo ngày
      const dailyRevenueData = [
         ["DOANH THU THEO NGÀY GẦN NHẤT"],
         [],
         ["Ngày", "Doanh thu"]
      ];
      (report.daily_revenue || []).forEach((item: any) => {
         dailyRevenueData.push([
            item.date,
            item.revenue
         ]);
      });
      const wsDaily = XLSX.utils.aoa_to_sheet(dailyRevenueData);

      // Build Workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsOverview, "Tổng quan");
      XLSX.utils.book_append_sheet(wb, wsCashflow, "Chi tiết dòng tiền");
      XLSX.utils.book_append_sheet(wb, wsTopShops, "Top Cửa hàng");
      XLSX.utils.book_append_sheet(wb, wsDaily, "Doanh thu theo ngày");

      // Save file
      const fileName = `Bao_cao_tai_chinh_${dateFrom || "all"}_to_${dateTo || "now"}.xlsx`;
      XLSX.writeFile(wb, fileName);
   };

   if (loading && !report) {
      return (
         <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="animate-spin text-gray-400" />
         </div>
      );
   }

   if (!report) return null;

   return (
      <div className={`space-y-10 transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div>
               <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-serif font-black tracking-tighter uppercase">Báo cáo tài chính tổng</h1>
                  <span className="bg-red-100 text-red-700 border-2 border-black rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider select-none shrink-0">
                     Tháng hiện tại: {new Date().getMonth() + 1}/{new Date().getFullYear()}
                  </span>
               </div>
               <p className="text-gray-400 font-medium text-sm mt-1 italic">Theo dõi doanh thu, công nợ và dòng tiền COD/Thẻ</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
               <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Từ ngày</label>
                  <input type="date" value={dateFrom} onChange={e => handleDateFromChange(e.target.value)} className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm text-black" />
               </div>
               <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Đến ngày</label>
                  <input type="date" value={dateTo} onChange={e => handleDateToChange(e.target.value)} className="w-full border-2 border-black rounded-xl px-4 py-2 font-bold text-sm text-black" />
               </div>
               <button type="button" onClick={handleReset} className="mt-5 p-3 border-2 border-black rounded-xl hover:bg-gray-50 transition-all active:translate-y-1 shrink-0" title="Reset bộ lọc">
                  <RefreshCw size={18} />
               </button>
               <button type="button" onClick={handleExportExcel} className="mt-5 px-5 py-2.5 border-2 border-black bg-[#A3E635] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black hover:text-white transition-all shadow-subtle active:translate-y-1 flex items-center justify-center gap-2 w-full sm:w-auto shrink-0">
                  <FileDown size={16} /> Xuất Excel
               </button>
            </div>
         </div>

         {/* Tổng quan cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[
               { label: "Tiền thu hàng hoá (GMV)", value: `${fmt(report.summary.total_revenue)}₫`, icon: <TrendingUp className="text-green-500" /> },
               { label: "Tiền ship thu hộ", value: `${fmt(report.summary.total_shipping_fee)}₫`, icon: <Truck className="text-amber-500" /> },
               { label: "Chi phí Marketing (Trợ giá)", value: `${fmt(report.summary.platform_voucher_cost)}₫`, icon: <Gift className="text-pink-500" /> },
               { label: "Tiền trả cho Shop (Payout)", value: `${fmt(report.summary.total_shop_payout)}₫`, icon: <ArrowUpRight className="text-blue-500" /> },
               { label: "Lợi nhuận thực (Hoa hồng - Trợ giá)", value: `${fmt(report.summary.platform_profit - report.summary.platform_voucher_cost)}₫`, icon: <DollarSign className="text-red-500" /> },
            ].map((s, i) => (
               <div key={i} className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm flex flex-col gap-4 group hover:shadow-brutal transition-all cursor-default">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-gray-50 border-2 border-black/5 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white transition-all">{s.icon}</div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">{s.label}</p>
                  </div>
                  <p className="text-2xl font-black tracking-tighter">{s.value}</p>
               </div>
            ))}
         </div>

         {/* So sánh COD vs Thẻ */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* COD */}
            <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-black/5">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center border-2 border-black/10">
                     <Truck size={22} className="text-amber-600" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black uppercase tracking-tighter">Thanh toán COD</h3>
                     <p className="text-[10px] font-bold text-gray-400">Khấu trừ {report.cod.deduction_rate}% (Chiết khấu + Thuế)</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                     <span className="text-xs font-bold text-gray-500 uppercase">Doanh thu COD</span>
                     <span className="text-lg font-black">{fmt(report.cod.revenue)}₫</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                     <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><ArrowDownRight size={14} className="text-red-400" /> Chiết khấu sàn ({report.rates.commission_rate}%)</span>
                     <span className="text-sm font-black text-red-500">-{fmt(report.cod.commission)}₫</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                     <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><ArrowDownRight size={14} className="text-red-400" /> Thuế ({report.rates.tax_rate}%)</span>
                     <span className="text-sm font-black text-red-500">-{fmt(report.cod.tax)}₫</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-green-50 rounded-xl px-4 border-2 border-green-200">
                     <span className="text-xs font-black text-green-700 uppercase">Shop nhận về</span>
                     <span className="text-xl font-black text-green-700">{fmt(report.cod.shop_payout)}₫</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 text-center">{report.cod.order_count} đơn hàng COD</p>
               </div>
            </div>

            {/* Thẻ trực tuyến */}
            <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-black/5">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center border-2 border-black/10">
                     <CreditCard size={22} className="text-blue-600" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black uppercase tracking-tighter">Thanh toán Thẻ trực tuyến</h3>
                     <p className="text-[10px] font-bold text-gray-400">Khấu trừ {report.online.deduction_rate}% (Chiết khấu + Phí cổng + Thuế)</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                     <span className="text-xs font-bold text-gray-500 uppercase">Doanh thu Thẻ</span>
                     <span className="text-lg font-black">{fmt(report.online.revenue)}₫</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                     <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><ArrowDownRight size={14} className="text-red-400" /> Chiết khấu sàn ({report.rates.commission_rate}%)</span>
                     <span className="text-sm font-black text-red-500">-{fmt(report.online.commission)}₫</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                     <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><ArrowDownRight size={14} className="text-blue-400" /> Phí cổng TT ({report.rates.gateway_fee}%)</span>
                     <span className="text-sm font-black text-blue-500">-{fmt(report.online.gateway_fee)}₫</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                     <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><ArrowDownRight size={14} className="text-red-400" /> Thuế ({report.rates.tax_rate}%)</span>
                     <span className="text-sm font-black text-red-500">-{fmt(report.online.tax)}₫</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-green-50 rounded-xl px-4 border-2 border-green-200">
                     <span className="text-xs font-black text-green-700 uppercase">Shop nhận về</span>
                     <span className="text-xl font-black text-green-700">{fmt(report.online.shop_payout)}₫</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 text-center">{report.online.order_count} đơn hàng Thẻ</p>
               </div>
            </div>
         </div>

         {/* Bảng tổng hợp khấu trừ */}
         <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
               <BarChart3 size={20} /> Tổng hợp dòng tiền
            </h3>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b-2 border-black/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <th className="px-6 py-4">Khoản mục</th>
                        <th className="px-6 py-4 text-right">COD</th>
                        <th className="px-6 py-4 text-right">Thẻ trực tuyến</th>
                        <th className="px-6 py-4 text-right">Tổng cộng</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                     <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-bold">Doanh thu gốc</td>
                        <td className="px-6 py-4 text-sm font-black text-right">{fmt(report.cod.revenue)}₫</td>
                        <td className="px-6 py-4 text-sm font-black text-right">{fmt(report.online.revenue)}₫</td>
                        <td className="px-6 py-4 text-sm font-black text-right">{fmt(report.summary.total_revenue)}₫</td>
                     </tr>
                     <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-bold text-red-500">(-) Chiết khấu sàn {report.rates.commission_rate}%</td>
                        <td className="px-6 py-4 text-sm font-black text-red-500 text-right">-{fmt(report.cod.commission)}₫</td>
                        <td className="px-6 py-4 text-sm font-black text-red-500 text-right">-{fmt(report.online.commission)}₫</td>
                        <td className="px-6 py-4 text-sm font-black text-red-500 text-right">-{fmt(report.summary.total_commission)}₫</td>
                     </tr>
                     <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-bold text-blue-500">(-) Phí cổng TT {report.rates.gateway_fee}%</td>
                        <td className="px-6 py-4 text-sm font-black text-gray-300 text-right">—</td>
                        <td className="px-6 py-4 text-sm font-black text-blue-500 text-right">-{fmt(report.online.gateway_fee)}₫</td>
                        <td className="px-6 py-4 text-sm font-black text-blue-500 text-right">-{fmt(report.summary.total_gateway_fee)}₫</td>
                     </tr>
                     <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-bold text-purple-500">(-) Thuế {report.rates.tax_rate}%</td>
                        <td className="px-6 py-4 text-sm font-black text-purple-500 text-right">-{fmt(report.cod.tax)}₫</td>
                        <td className="px-6 py-4 text-sm font-black text-purple-500 text-right">-{fmt(report.online.tax)}₫</td>
                        <td className="px-6 py-4 text-sm font-black text-purple-500 text-right">-{fmt(report.summary.total_tax)}₫</td>
                     </tr>
                     <tr className="bg-green-50 border-2 border-green-200 rounded-xl">
                        <td className="px-6 py-4 text-sm font-black text-green-700 uppercase">(=) Chuyển trả Shop</td>
                        <td className="px-6 py-4 text-sm font-black text-green-700 text-right">{fmt(report.cod.shop_payout)}₫</td>
                        <td className="px-6 py-4 text-sm font-black text-green-700 text-right">{fmt(report.online.shop_payout)}₫</td>
                        <td className="px-6 py-4 text-lg font-black text-green-700 text-right">{fmt(report.summary.total_shop_payout)}₫</td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>

         {/* Top shops + Biểu đồ doanh thu */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Doanh thu */}
            <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <h3 className="text-lg font-black uppercase tracking-tighter">
                     Biến động doanh thu ({groupBy === "day" ? "Tuần" : groupBy === "week" ? "Tháng" : "Năm"})
                  </h3>
                  <div className="flex bg-gray-100 p-1 border-2 border-black rounded-xl select-none shrink-0">
                     {[
                        { label: "Tuần", value: "day" },
                        { label: "Tháng", value: "week" },
                        { label: "Năm", value: "month" }
                     ].map((g) => (
                        <button
                           type="button"
                           key={g.value}
                           onClick={() => handleChartGroupChange(g.value as any)}
                           className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${
                              groupBy === g.value
                                 ? "bg-black text-white"
                                 : "text-gray-400 hover:text-black"
                           }`}
                        >
                           {g.label}
                        </button>
                     ))}
                  </div>
               </div>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height={250} minWidth={0}>
                     <LineChart data={report.daily_revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={10} fontWeight="bold" tickFormatter={(val) => `${val / 1000}k`} tickLine={false} axisLine={false} />
                        <Tooltip
                           formatter={(value: any) => [`${fmt(value)}₫`, "Doanh thu"]}
                           labelFormatter={(label) => `${label}`}
                           contentStyle={{ border: '2px solid black', borderRadius: '12px', fontWeight: 'bold' }}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={4} activeDot={{ r: 8, fill: "#000" }} dot={{ r: 4, fill: "#dc2626", strokeWidth: 2, stroke: "#fff" }} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Top shops */}
            <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
               <h3 className="text-lg font-black uppercase tracking-tighter mb-8">Top shops theo doanh thu</h3>
               {report.top_shops?.length > 0 ? (
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                     {report.top_shops.map((shop: any, i: number) => (
                        <div key={shop.shop_id} className="flex items-center gap-4 p-4 rounded-xl border-2 border-black/5 hover:border-black transition-all">
                           <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border-2 border-black ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-300' : i === 2 ? 'bg-amber-600 text-white' : 'bg-white'}`}>
                              {i + 1}
                           </span>
                           <div className="flex-grow">
                              <p className="text-sm font-black">{shop.shop_name}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{shop.order_count} đơn</p>
                           </div>
                           <span className="text-sm font-black text-green-600">{fmt(shop.total_revenue)}₫</span>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="text-center py-10">
                     <Store size={32} className="mx-auto text-gray-300 mb-3" />
                     <p className="text-gray-400 font-bold text-xs">Chưa có dữ liệu</p>
                  </div>
               )}
            </div>
         </div>

         {/* Thống kê đơn theo trạng thái */}
         <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Thống kê đơn hàng theo trạng thái</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
               {report.orders_by_status?.map((os: any) => {
                  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                     PENDING: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', label: getOrderStatusLabel('PENDING') },
                     PREPARING: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: getOrderStatusLabel('PREPARING') },
                     READY_FOR_PICKUP: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', label: getOrderStatusLabel('READY_FOR_PICKUP') },
                     PICKED_UP: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-700', label: getShipmentStatusLabel('PICKED_UP') },
                     IN_TRANSIT: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', label: getShipmentStatusLabel('IN_TRANSIT') },
                     DELIVERING: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: getOrderStatusLabel('DELIVERING') },
                     DELIVERED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: getOrderStatusLabel('DELIVERED') },
                     COMPLETED: { bg: 'bg-green-100 border-green-300', text: 'text-green-800', label: getOrderStatusLabel('COMPLETED') },
                     CANCELLED: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: getOrderStatusLabel('CANCELLED') },
                     FAILED: { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: getOrderStatusLabel('FAILED') },
                     RETURN_PENDING: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-600', label: getOrderStatusLabel('RETURN_PENDING') },
                     RETURNED: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', label: getOrderStatusLabel('RETURNED') },
                  };
                  const cfg = statusConfig[os.status] || { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', label: getOrderStatusLabel(os.status) || getShipmentStatusLabel(os.status) || os.status };

                  return (
                     <div key={os.status} className={`border-2 rounded-2xl p-5 text-center ${cfg.bg}`}>
                        <p className={`text-2xl font-black ${cfg.text}`}>{os.count}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{cfg.label}</p>
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Tổng hợp đơn hàng và doanh thu các shop */}
         <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
               <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3">
                  <Store size={20} /> Tổng hợp đơn hàng và doanh thu các shop
               </h3>
               <div className="flex items-center gap-2 select-none shrink-0">
                  <div className="flex items-center gap-1">
                     <span className="text-[10px] font-black uppercase text-gray-400">Tháng</span>
                     <select
                        value={shopMonth}
                        onChange={(e) => setShopMonth(parseInt(e.target.value))}
                        className="border-2 border-black rounded-xl px-3 py-1.5 font-bold text-xs bg-white text-black focus:outline-none"
                     >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                           <option key={m} value={m}>Tháng {m}</option>
                        ))}
                     </select>
                  </div>
                  <div className="flex items-center gap-1">
                     <span className="text-[10px] font-black uppercase text-gray-400">Năm</span>
                     <select
                        value={shopYear}
                        onChange={(e) => setShopYear(parseInt(e.target.value))}
                        className="border-2 border-black rounded-xl px-3 py-1.5 font-bold text-xs bg-white text-black focus:outline-none"
                     >
                        {[2024, 2025, 2026, 2027].map((y) => (
                           <option key={y} value={y}>Năm {y}</option>
                        ))}
                     </select>
                  </div>
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b-2 border-black/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <th className="px-6 py-4">Tên Shop</th>
                        <th className="px-6 py-4 text-center">Số đơn giao thành công</th>
                        <th className="px-6 py-4 text-right">Doanh thu gốc</th>
                        <th className="px-6 py-4 text-right">Chiết khấu sàn</th>
                        <th className="px-6 py-4 text-right">Thuế & Phí cổng</th>
                        <th className="px-6 py-4 text-right">Shop nhận về</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-xs font-bold text-black">
                     {report.shop_reports?.length > 0 ? (
                        report.shop_reports.map((shop: any) => (
                           <tr key={shop.shop_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-black">{shop.shop_name}</td>
                              <td className="px-6 py-4 text-center font-black">{shop.order_count} đơn</td>
                              <td className="px-6 py-4 text-right text-sm font-black">{fmt(shop.total_revenue)}₫</td>
                              <td className="px-6 py-4 text-right text-red-500">-{fmt(shop.commission)}₫</td>
                              <td className="px-6 py-4 text-right text-blue-500">-{fmt(shop.tax + shop.gateway_fee)}₫</td>
                              <td className="px-6 py-4 text-right text-sm font-black text-green-700">{fmt(shop.payout)}₫</td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan={6} className="px-6 py-8 text-center text-gray-400 uppercase tracking-widest text-[10px]">Chưa có dữ liệu giao dịch cho các shop</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
};
