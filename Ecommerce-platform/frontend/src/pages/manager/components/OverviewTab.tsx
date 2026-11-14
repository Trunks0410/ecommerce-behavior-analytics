import React from "react";
import {
  Box,
  AlertCircle,
  Ticket,
  ShieldAlert,
  Loader2,
  BarChart3,
  RefreshCw,
} from "lucide-react";

interface OverviewTabProps {
  stats: any;
  isStatsLoading: boolean;
  notifications: string[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  isStatsLoading,
  notifications,
}) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif font-black tracking-tighter uppercase mb-2">
            Hệ thống Manager
          </h1>
          <p className="text-gray-500 font-medium italic">
            Giám sát hoạt động của các Vendor và Sản phẩm từ Database thực tế.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      {isStatsLoading ? (
        <div className="flex items-center justify-center h-32 bg-white border-2 border-black rounded-2xl">
          <Loader2 className="animate-spin text-primary mr-2" />
          <span className="text-sm font-bold uppercase tracking-wider">
            Đang tải thống kê...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              label: "Sản phẩm chờ duyệt",
              value: stats?.pendingProducts ?? 0,
              sub: "Cần kiểm duyệt",
              icon: <Box className="text-primary" />,
            },
            {
              label: "Tranh chấp & Khiếu nại",
              value: stats?.pendingDisputes ?? 0,
              sub: "Cần hòa giải",
              icon: <AlertCircle className="text-amber-500" />,
            },
            {
              label: "Voucher toàn sàn",
              value: stats?.platformVouchers ?? 0,
              sub: "Đang hoạt động",
              icon: <Ticket className="text-green-500" />,
            },
            {
              label: "Gian hàng bị khóa",
              value: stats?.bannedShops ?? 0,
              sub: "Vi phạm chính sách",
              icon: <ShieldAlert className="text-red-500" />,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm flex flex-col gap-4"
            >
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-black/5">
                  {stat.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                  {stat.sub}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {stat.label}
                </p>
                <p className="text-3xl font-black tracking-tighter mt-1">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
            <BarChart3 className="text-primary" /> Thống kê hoạt động
          </h3>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {[30, 55, 75, 40, 95, 80, 60, 45, 85, 30, 70, 90].map(
              (h, i) => (
                <div
                  key={i}
                  className="flex-grow bg-black rounded-t-lg hover:bg-primary transition-all group cursor-pointer relative"
                  style={{ height: `${h}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all">
                    Tuần {i + 1}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm flex flex-col">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-4">
            Nhật ký xử lý nhanh
          </h3>
          <div className="space-y-4 flex-grow overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                <RefreshCw size={24} className="animate-spin mb-2" />
                <p className="text-xs font-bold">
                  Chờ các hành động vận hành...
                </p>
              </div>
            ) : (
              notifications.map((msg, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>
                  <p className="text-xs font-bold text-gray-700 leading-tight">
                    {msg}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
