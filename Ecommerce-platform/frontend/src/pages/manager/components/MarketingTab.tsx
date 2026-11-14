import React, { useState } from "react";
import {
  Ticket,
  Megaphone,
  Loader2,
  X,
} from "lucide-react";
import {
  useVouchers,
  useCreateVoucher,
  useDeleteVoucher,
  useCampaigns,
  useCreateCampaign,
  useCategories,
} from "@/hooks/useManager";

interface MarketingTabProps {
  addNotification: (msg: string) => void;
}

export const MarketingTab: React.FC<MarketingTabProps> = ({ addNotification }) => {
  const { data: vouchers, isLoading: isVouchersLoading } = useVouchers();
  const { data: campaigns, isLoading: isCampaignsLoading } = useCampaigns();
  const { data: categories } = useCategories();

  const createVoucherMutation = useCreateVoucher();
  const deleteVoucherMutation = useDeleteVoucher();
  const createCampaignMutation = useCreateCampaign();

  const [newVoucher, setNewVoucher] = useState({
    code: "",
    discount_type: "PERCENT" as "PERCENT" | "FIXED",
    discount_value: "",
    max_discount: "",
    min_order_amount: "",
    usage_limit: "",
    start_date: "",
    end_date: "",
    category_id: "",
  });

  const [newCampaign, setNewCampaign] = useState({
    title: "",
    type: "Flash sale",
    date: "",
  });

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucher.code.trim()) {
      alert("Vui lòng nhập mã Voucher!");
      return;
    }
    if (!/^[A-Z0-9_-]+$/i.test(newVoucher.code)) {
      alert("Mã voucher chỉ được bao gồm chữ cái, số, gạch ngang và gạch dưới!");
      return;
    }
    if (!newVoucher.discount_value) {
      alert("Vui lòng nhập mức giảm giá!");
      return;
    }

    const dVal = Number(newVoucher.discount_value);
    if (isNaN(dVal) || dVal <= 0) {
      alert("Mức giảm giá phải lớn hơn 0!");
      return;
    }

    if (newVoucher.discount_type === "PERCENT" && dVal > 100) {
      alert("Mức giảm phần trăm không được vượt quá 100%!");
      return;
    }

    const minOrder = Number(newVoucher.min_order_amount || 0);
    if (isNaN(minOrder) || minOrder < 0) {
      alert("Đơn tối thiểu không hợp lệ!");
      return;
    }

    if (newVoucher.discount_type === "FIXED" && dVal > minOrder) {
      alert("Mức giảm tiền mặt không được lớn hơn đơn tối thiểu!");
      return;
    }

    let limit: number | null = null;
    if (newVoucher.usage_limit) {
      limit = Number(newVoucher.usage_limit);
      if (isNaN(limit) || limit <= 0) {
        alert("Giới hạn lượt dùng phải lớn hơn 0!");
        return;
      }
    }

    let maxDisc: number | null = null;
    if (newVoucher.discount_type === "PERCENT" && newVoucher.max_discount) {
      maxDisc = Number(newVoucher.max_discount);
      if (isNaN(maxDisc) || maxDisc < 0) {
        alert("Mức giảm tối đa không hợp lệ!");
        return;
      }
    }

    if (!newVoucher.start_date || !newVoucher.end_date) {
      alert("Vui lòng nhập đầy đủ ngày bắt đầu và kết thúc!");
      return;
    }

    const sDate = new Date(newVoucher.start_date);
    const eDate = new Date(newVoucher.end_date);

    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
      alert("Ngày bắt đầu hoặc kết thúc không đúng định dạng!");
      return;
    }

    if (sDate >= eDate) {
      alert("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }

    // Check code duplication client-side
    const existsLocally = vouchers?.some(
      (v: any) => v.code.toUpperCase() === newVoucher.code.toUpperCase().trim(),
    );
    if (existsLocally) {
      alert("Mã giảm giá này đã tồn tại trên danh sách active của hệ thống!");
      return;
    }

    createVoucherMutation.mutate(
      {
        code: newVoucher.code.toUpperCase().trim(),
        discount_type: newVoucher.discount_type,
        discount_value: dVal,
        max_discount: maxDisc,
        min_order_amount: minOrder,
        usage_limit: limit,
        start_date: newVoucher.start_date,
        end_date: newVoucher.end_date,
        category_id: newVoucher.category_id ? Number(newVoucher.category_id) : null,
      },
      {
        onSuccess: (data) => {
          addNotification(`Tạo thành công voucher sàn: ${data.code}`);
          setNewVoucher({
            code: "",
            discount_type: "PERCENT",
            discount_value: "",
            max_discount: "",
            min_order_amount: "",
            usage_limit: "",
            start_date: "",
            end_date: "",
            category_id: "",
          });
        },
        onError: (err: any) => {
          alert(err.response?.data?.message || "Tạo voucher thất bại");
        },
      },
    );
  };

  const handleDeleteVoucher = (id: number, code: string) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn hủy/tắt voucher sàn ${code}? Hành động này sẽ dừng hiệu lực của voucher ngay lập tức.`,
      )
    ) {
      return;
    }
    deleteVoucherMutation.mutate(id, {
      onSuccess: () => {
        addNotification(`Đã thu hồi voucher sàn: ${code}`);
      },
      onError: (err: any) => {
        alert(err.response?.data?.message || "Không thể xóa voucher sàn");
      },
    });
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.title.trim()) {
      alert("Vui lòng nhập tên sự kiện chiến dịch!");
      return;
    }
    createCampaignMutation.mutate(
      {
        title: newCampaign.title,
        type: newCampaign.type,
        date: newCampaign.date,
      },
      {
        onSuccess: (data: any) => {
          addNotification(`Kích hoạt chiến dịch marketing sàn: ${data.name || newCampaign.title}`);
          setNewCampaign({
            title: "",
            type: "Flash sale",
            date: "",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      <div>
        <h2 className="text-3xl font-serif font-black uppercase">
          Chiến dịch Marketing toàn sàn
        </h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
          Thiết lập vouchers toàn sàn và theo dõi chiến dịch hoạt động
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Voucher Form & List */}
        <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm flex flex-col gap-6">
          <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 border-b border-gray-100 pb-4">
            <Ticket className="text-primary" /> Tạo mã giảm giá sàn
          </h3>

          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Mã Voucher
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: VOUCHER100K"
                  value={newVoucher.code}
                  onChange={(e) =>
                    setNewVoucher({
                      ...newVoucher,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Loại giảm giá
                </label>
                <select
                  value={newVoucher.discount_type}
                  onChange={(e) =>
                    setNewVoucher({
                      ...newVoucher,
                      discount_type: e.target.value as "PERCENT" | "FIXED",
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold focus:outline-none"
                >
                  <option value="PERCENT">Giảm theo %</option>
                  <option value="FIXED">Số tiền cố định (VNĐ)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  {newVoucher.discount_type === "PERCENT" ? "Mức giảm (%)" : "Mức giảm (VNĐ)"}
                </label>
                <input
                  type="number"
                  placeholder={newVoucher.discount_type === "PERCENT" ? "Ví dụ: 10" : "Ví dụ: 50000"}
                  value={newVoucher.discount_value}
                  onChange={(e) =>
                    setNewVoucher({
                      ...newVoucher,
                      discount_value: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Giảm tối đa (VNĐ)
                </label>
                <input
                  type="number"
                  placeholder="Chỉ dùng cho % (Ví dụ: 50000)"
                  disabled={newVoucher.discount_type !== "PERCENT"}
                  value={newVoucher.max_discount}
                  onChange={(e) =>
                    setNewVoucher({
                      ...newVoucher,
                      max_discount: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold disabled:opacity-50 disabled:bg-gray-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Đơn tối thiểu (VNĐ)
                </label>
                <input
                  type="number"
                  placeholder="Ví dụ: 100000"
                  value={newVoucher.min_order_amount}
                  onChange={(e) =>
                    setNewVoucher({
                      ...newVoucher,
                      min_order_amount: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Lượt dùng tối đa
                </label>
                <input
                  type="number"
                  placeholder="Ví dụ: 100 (Để trống = ∞)"
                  value={newVoucher.usage_limit}
                  onChange={(e) =>
                    setNewVoucher({
                      ...newVoucher,
                      usage_limit: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                />
              </div>
            </div>

            {/* Voucher Category selector dropdown */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                Danh mục áp dụng (Voucher theo danh mục)
              </label>
              <select
                value={newVoucher.category_id}
                onChange={(e) =>
                  setNewVoucher({
                    ...newVoucher,
                    category_id: e.target.value,
                  })
                }
                className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold focus:outline-none"
              >
                <option value="">Áp dụng toàn sàn (Tất cả danh mục)</option>
                {categories?.data?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Ngày bắt đầu
                </label>
                <input
                  type="datetime-local"
                  value={newVoucher.start_date}
                  onChange={(e) =>
                    setNewVoucher({
                      ...newVoucher,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Ngày kết thúc
                </label>
                <input
                  type="datetime-local"
                  value={newVoucher.end_date}
                  onChange={(e) =>
                    setNewVoucher({
                      ...newVoucher,
                      end_date: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createVoucherMutation.isPending}
              className="w-full py-4 bg-black text-white border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-subtle active:translate-y-1 disabled:opacity-50"
            >
              {createVoucherMutation.isPending ? "ĐANG PHÁT HÀNH..." : "PHÁT HÀNH VOUCHER TOÀN SÀN"}
            </button>
          </form>

          <div className="pt-6 border-t border-dashed border-gray-200 flex-grow animate-in fade-in">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Vouchers toàn sàn từ Database
            </h4>
            {isVouchersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-primary" size={20} />
              </div>
            ) : (
              <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
                {!vouchers || vouchers.length === 0 ? (
                  <p className="text-xs text-gray-400 italic font-bold">
                    Chưa có voucher toàn sàn nào được tạo.
                  </p>
                ) : (
                  vouchers.map((v: any) => {
                    const now = new Date();
                    const start = new Date(v.start_date);
                    const end = new Date(v.end_date);
                    const isLimitReached = v.usage_limit && v.used_count >= v.usage_limit;

                    let statusLabel = "ĐANG HOẠT ĐỘNG";
                    let statusClass = "bg-green-50 text-green-600 border-green-100";

                    if (now < start) {
                      statusLabel = "CHƯA DIỄN RA";
                      statusClass = "bg-blue-50 text-blue-600 border-blue-100";
                    } else if (now > end) {
                      statusLabel = "HẾT HẠN";
                      statusClass = "bg-red-50 text-red-500 border-red-100";
                    } else if (isLimitReached) {
                      statusLabel = "HẾT LƯỢT";
                      statusClass = "bg-amber-50 text-amber-600 border-amber-100";
                    }

                    return (
                      <div
                        key={v.id}
                        className="flex justify-between items-center bg-gray-50 border-2 border-black/5 rounded-xl p-4 gap-4"
                      >
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase">{v.code}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${statusClass}`}>
                              {statusLabel}
                            </span>
                            {v.category && (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-purple-50 text-purple-600 border-purple-100">
                                Danh mục: {v.category.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 mt-1 space-y-0.5">
                            <p>
                              Giảm:{" "}
                              <span className="text-black font-extrabold">
                                {v.discount_type === "PERCENT"
                                  ? `${v.discount_value}%`
                                  : `${Number(v.discount_value).toLocaleString()}₫`}
                              </span>
                              {v.discount_type === "PERCENT" &&
                                v.max_discount &&
                                ` (Tối đa ${Number(v.max_discount).toLocaleString()}₫)`}
                              {" | "} Đơn tối thiểu:{" "}
                              <span className="text-black font-extrabold">
                                {Number(v.min_order_amount).toLocaleString()}₫
                              </span>
                            </p>
                            <p>
                              Lượt dùng:{" "}
                              <span className="text-black font-extrabold">
                                {v.used_count} / {v.usage_limit || "∞"}
                              </span>
                            </p>
                            <p className="text-[9px] italic text-gray-400">
                              Hạn dùng: {start.toLocaleString()} - {end.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteVoucher(v.id, v.code)}
                          disabled={deleteVoucherMutation.isPending}
                          className="p-2 border-2 border-black rounded-xl text-red-600 bg-white hover:bg-red-500 hover:text-white transition-all shadow-subtle active:translate-y-0.5 disabled:opacity-50"
                          title="Hủy/Xóa Voucher"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Campaign Form & List */}
        <div className="bg-white border-2 border-black rounded-[2rem] p-8 shadow-sm flex flex-col gap-6">
          <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 border-b border-gray-100 pb-4">
            <Megaphone className="text-primary" /> Thiết lập chiến dịch Flash Sale
          </h3>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                Tên chiến dịch / Sự kiện
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Siêu Flash Sale 7/7"
                value={newCampaign.title}
                onChange={(e) =>
                  setNewCampaign({
                    ...newCampaign,
                    title: e.target.value,
                  })
                }
                className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Phân loại
                </label>
                <select
                  value={newCampaign.type}
                  onChange={(e) =>
                    setNewCampaign({
                      ...newCampaign,
                      type: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold focus:outline-none"
                >
                  <option value="Flash sale">Flash Sale</option>
                  <option value="Banner Marketing">Banner Marketing</option>
                  <option value="Sự kiện toàn sàn">Sự kiện toàn sàn</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-2">
                  Thời gian diễn ra
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 07/07/2026"
                  value={newCampaign.date}
                  onChange={(e) =>
                    setNewCampaign({
                      ...newCampaign,
                      date: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border-2 border-black rounded-xl p-3 text-xs font-bold"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={createCampaignMutation.isPending}
              className="w-full py-4 bg-black text-white border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-subtle active:translate-y-1 disabled:opacity-50"
            >
              {createCampaignMutation.isPending ? "ĐANG THIẾT LẬP..." : "KÍCH HOẠT CHIẾN DỊCH HỆ THỐNG"}
            </button>
          </form>

          <div className="pt-6 border-t border-dashed border-gray-200 flex-grow">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Danh sách chiến dịch
            </h4>
            {isCampaignsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-primary" size={20} />
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {!campaigns || campaigns.length === 0 ? (
                  <p className="text-xs text-gray-400 italic font-bold">
                    Chưa có chiến dịch nào được tạo.
                  </p>
                ) : (
                  campaigns.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center bg-gray-50 border-2 border-black/5 rounded-xl p-4"
                    >
                      <div>
                        <p className="text-xs font-black uppercase">{c.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                          {c.description} | Trạng thái: {c.status}
                        </p>
                      </div>
                      <span className="text-[9px] font-black uppercase px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg">
                        ĐANG LÊN LỊCH
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
