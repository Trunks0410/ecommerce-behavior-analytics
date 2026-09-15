import React, { useState } from "react";
import {
  Users,
  Lock,
  Unlock,
  Loader2,
  AlertTriangle,
  Search,
  Check,
  X,
  Store,
} from "lucide-react";
import {
  useVendors,
  useUpdateVendorStatus,
  useApproveShop,
  useRejectShop,
} from "@/hooks/useManager";

interface VendorTabProps {
  addNotification: (msg: string) => void;
}

export const VendorTab: React.FC<VendorTabProps> = ({ addNotification }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [subTab, setSubTab] = useState<"pending" | "active" | "blocked">("pending");

  const [lockModal, setLockModal] = useState<{
    show: boolean;
    vendorId: number | null;
    vendorName: string;
    reason: string;
  }>({
    show: false,
    vendorId: null,
    vendorName: "",
    reason: "",
  });

  const [rejectModal, setRejectModal] = useState<{
    show: boolean;
    shopId: number | null;
    shopName: string;
    reason: string;
  }>({
    show: false,
    shopId: null,
    shopName: "",
    reason: "",
  });

  const { data: vendors, isLoading: isVendorsLoading } = useVendors();
  const updateVendorMutation = useUpdateVendorStatus();
  const approveShopMutation = useApproveShop();
  const rejectShopMutation = useRejectShop();

  const handleUnlockVendor = (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn mở khóa cho shop "${name}"?`)) return;
    updateVendorMutation.mutate(
      { id, status: "APPROVED", reason: "Mở khóa bởi Manager" },
      {
        onSuccess: () => {
          addNotification(`Đã mở khóa hoạt động cho Shop "${name}".`);
        },
        onError: (err: any) => {
          alert(err.response?.data?.message || "Mở khóa thất bại");
        },
      },
    );
  };

  const openLockVendorModal = (id: number, name: string) => {
    setLockModal({
      show: true,
      vendorId: id,
      vendorName: name,
      reason: "",
    });
  };

  const handleConfirmLockVendor = () => {
    if (!lockModal.vendorId) return;
    if (!lockModal.reason.trim()) {
      alert("Vui lòng điền lý do khóa Shop!");
      return;
    }
    updateVendorMutation.mutate(
      { id: lockModal.vendorId, status: "BANNED", reason: lockModal.reason },
      {
        onSuccess: () => {
          addNotification(`Đã Khóa hoạt động Shop "${lockModal.vendorName}".`);
          setLockModal({
            show: false,
            vendorId: null,
            vendorName: "",
            reason: "",
          });
        },
        onError: (err: any) => {
          alert(err.response?.data?.message || "Khóa Shop thất bại");
        },
      },
    );
  };

  const handleApproveShop = (id: number, name: string) => {
    if (!confirm(`Xác nhận phê duyệt gian hàng "${name}" hoạt động trên hệ thống?`)) return;
    approveShopMutation.mutate(id, {
      onSuccess: () => {
        addNotification(`Đã phê duyệt hoạt động cho Shop "${name}".`);
      },
      onError: (err: any) => {
        alert(err.response?.data?.message || "Duyệt shop thất bại");
      },
    });
  };

  const handleConfirmRejectShop = () => {
    if (!rejectModal.shopId) return;
    if (!rejectModal.reason.trim()) {
      alert("Vui lòng điền lý do từ chối!");
      return;
    }
    rejectShopMutation.mutate(
      { id: rejectModal.shopId, reason: rejectModal.reason },
      {
        onSuccess: () => {
          addNotification(`Đã từ chối đơn đăng ký Shop "${rejectModal.shopName}".`);
          setRejectModal({
            show: false,
            shopId: null,
            shopName: "",
            reason: "",
          });
        },
        onError: (err: any) => {
          alert(err.response?.data?.message || "Từ chối shop thất bại");
        },
      },
    );
  };

  // Filter list by search term and tab
  const getFilteredVendors = () => {
    if (!vendors) return [];
    return vendors.filter((v: any) => {
      const matchSearch = v.shop_name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (subTab === "pending") {
        return v.status === "PENDING";
      }
      if (subTab === "active") {
        return v.status === "APPROVED" || v.status === "ACTIVE";
      }
      if (subTab === "blocked") {
        return v.status === "BANNED";
      }
      return true;
    });
  };

  const filteredList = getFilteredVendors();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-black uppercase">
            Quản lý & Phê duyệt Shop
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Xét duyệt đăng ký gian hàng mới và quản lý hoạt động shop bán lẻ
          </p>
        </div>
        {/* Search bar */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Tìm theo tên gian hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-black rounded-xl py-2 px-4 pr-10 text-xs font-bold focus:outline-none"
          />
          <Search size={16} className="absolute right-3 top-3 text-gray-400" />
        </div>
      </div>

      {/* Sub-tab selection */}
      <div className="flex gap-2 border-b border-black pb-1.5">
        {[
          { id: "pending", label: "Yêu cầu chờ duyệt" },
          { id: "active", label: "Cửa hàng hoạt động" },
          { id: "blocked", label: "Cửa hàng bị khóa" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`px-5 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all ${
              subTab === tab.id
                ? "bg-black text-white shadow-subtle translate-y-[2px]"
                : "bg-white hover:bg-gray-50 text-black"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isVendorsLoading ? (
        <div className="flex justify-center py-20 bg-white border-2 border-black rounded-[2.5rem]">
          <Loader2 className="animate-spin text-primary" size={36} />
        </div>
      ) : (
        <div className="bg-white border-2 border-black rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-black/5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/50">
                <th className="px-8 py-6">Tên gian hàng (Shop Name)</th>
                <th className="px-8 py-6">Người đại diện (Email/Phone)</th>
                {subTab !== "pending" && <th className="px-8 py-6">Độ uy tín</th>}
                <th className="px-8 py-6">Trạng thái hoạt động</th>
                <th className="px-8 py-6 text-right">Thao tác xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/5">
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-10 text-center text-xs font-bold text-gray-400 italic"
                  >
                    Không tìm thấy gian hàng nào trong mục này.
                  </td>
                </tr>
              ) : (
                filteredList.map((vendor: any) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl border border-black/5 flex items-center justify-center font-black text-primary">
                          V{vendor.id}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase">
                            {vendor.shop_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-gray-600">
                      <p>{vendor.vendor?.profile?.full_name || "N/A"}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {vendor.vendor?.email} | {vendor.vendor?.phone}
                      </p>
                    </td>
                    {subTab !== "pending" && (
                      <td className="px-8 py-6 text-xs font-bold text-amber-500">
                        {vendor.rating} ★
                      </td>
                    )}
                    <td className="px-8 py-6">
                      <span
                        className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${
                          vendor.status === "BANNED"
                            ? "bg-red-50 text-red-500 border-red-100"
                            : vendor.status === "PENDING"
                            ? "bg-yellow-50 text-yellow-600 border-yellow-100"
                            : "bg-green-50 text-green-600 border-green-100"
                        }`}
                      >
                        {vendor.status === "BANNED"
                          ? "Bị khóa"
                          : vendor.status === "PENDING"
                          ? "Chờ xét duyệt"
                          : "Đang hoạt động"}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {subTab === "pending" && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() =>
                              setRejectModal({
                                show: true,
                                shopId: vendor.id,
                                shopName: vendor.shop_name,
                                reason: "",
                              })
                            }
                            disabled={rejectShopMutation.isPending}
                            className="px-3 py-2 border-2 border-black rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 text-red-600 bg-white hover:bg-red-50 active:translate-y-0.5"
                          >
                            <X size={12} /> Từ chối
                          </button>
                          <button
                            onClick={() => handleApproveShop(vendor.id, vendor.shop_name)}
                            disabled={approveShopMutation.isPending}
                            className="px-3 py-2 border-2 border-black bg-primary text-black rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-subtle hover:shadow-none hover:translate-y-0.5"
                          >
                            <Check size={12} /> Phê duyệt
                          </button>
                        </div>
                      )}

                      {subTab === "active" && (
                        <button
                          onClick={() => openLockVendorModal(vendor.id, vendor.shop_name)}
                          disabled={updateVendorMutation.isPending}
                          className="px-4 py-2 border-2 border-black rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 ml-auto shadow-subtle active:translate-y-0.5 disabled:opacity-50 text-red-600 bg-white hover:bg-red-600 hover:text-white"
                        >
                          <Lock size={14} /> Khóa Shop
                        </button>
                      )}

                      {subTab === "blocked" && (
                        <button
                          onClick={() => handleUnlockVendor(vendor.id, vendor.shop_name)}
                          disabled={updateVendorMutation.isPending}
                          className="px-4 py-2 border-2 border-black rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 ml-auto shadow-subtle active:translate-y-0.5 disabled:opacity-50 text-green-600 bg-white hover:bg-green-600 hover:text-white"
                        >
                          <Unlock size={14} /> Mở khóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Lock Vendor Audit Reason Modal */}
      {lockModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black rounded-[2rem] p-8 max-w-md w-full shadow-brutal flex flex-col gap-6 transform animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={32} />
              <h3 className="text-xl font-serif font-black uppercase tracking-tight">
                Yêu cầu khóa gian hàng
              </h3>
            </div>

            <div className="text-sm font-bold text-gray-600 leading-relaxed">
              Bạn đang chuẩn bị khóa gian hàng{" "}
              <strong className="text-black uppercase">
                "{lockModal.vendorName}"
              </strong>
              . Hành động này sẽ tạm ngừng quyền bán lẻ và ẩn mọi sản phẩm thuộc gian hàng này.
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Lý do khóa Shop (Bắt buộc để lưu vết Audit Log)
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Bán hàng giả nhãn hiệu, lừa đảo giao dịch khách hàng..."
                value={lockModal.reason}
                onChange={(e) =>
                  setLockModal({ ...lockModal, reason: e.target.value })
                }
                className="bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() =>
                  setLockModal({
                    show: false,
                    vendorId: null,
                    vendorName: "",
                    reason: "",
                  })
                }
                className="px-5 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmLockVendor}
                disabled={updateVendorMutation.isPending}
                className="px-5 py-3 bg-red-600 text-white border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-subtle active:translate-y-0.5"
              >
                {updateVendorMutation.isPending ? "Đang xử lý..." : "Xác nhận khóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Shop Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black rounded-[2rem] p-8 max-w-md w-full shadow-brutal flex flex-col gap-6 transform animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={32} />
              <h3 className="text-xl font-serif font-black uppercase tracking-tight">
                Từ chối đăng ký gian hàng
              </h3>
            </div>

            <div className="text-sm font-bold text-gray-600 leading-relaxed">
              Bạn chuẩn bị từ chối đơn đăng ký gian hàng{" "}
              <strong className="text-black uppercase">
                "{rejectModal.shopName}"
              </strong>
              .
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Lý do từ chối (Bắt buộc gửi đến đối tác)
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Giấy phép kinh doanh không hợp lệ, hình ảnh cửa hàng mờ..."
                value={rejectModal.reason}
                onChange={(e) =>
                  setRejectModal({ ...rejectModal, reason: e.target.value })
                }
                className="bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() =>
                  setRejectModal({
                    show: false,
                    shopId: null,
                    shopName: "",
                    reason: "",
                  })
                }
                className="px-5 py-3 border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmRejectShop}
                disabled={rejectShopMutation.isPending}
                className="px-5 py-3 bg-red-600 text-white border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-subtle active:translate-y-0.5"
              >
                {rejectShopMutation.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
