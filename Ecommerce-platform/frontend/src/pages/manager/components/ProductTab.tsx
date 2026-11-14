import React, { useState } from "react";
import {
  Box,
  Store,
  Check,
  X,
  Lock,
  Unlock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
} from "lucide-react";
import {
  usePendingProducts,
  useActiveProducts,
  useUpdateProductStatus,
} from "@/hooks/useManager";

interface ProductTabProps {
  addNotification: (msg: string) => void;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8088";

export const ProductTab: React.FC<ProductTabProps> = ({ addNotification }) => {
  const [productSubTab, setProductSubTab] = useState("pending"); // "pending" | "active" | "blocked"
  const [searchTerm, setSearchTerm] = useState("");

  const { data: pendingProducts, isLoading: isPendingProductsLoading } = usePendingProducts();
  const { data: activeProducts, isLoading: isActiveProductsLoading } = useActiveProducts();
  const updateProductMutation = useUpdateProductStatus();

  const handleApproveProduct = (id: number, name: string) => {
    updateProductMutation.mutate(
      { id, status: "APPROVED" },
      {
        onSuccess: () =>
          addNotification(`Đã phê duyệt sản phẩm "${name}" thành công.`),
      },
    );
  };

  const handleRejectProduct = (id: number, name: string) => {
    updateProductMutation.mutate(
      { id, status: "REJECTED" },
      {
        onSuccess: () =>
          addNotification(`Đã từ chối kiểm duyệt sản phẩm "${name}".`),
      },
    );
  };

  const handleLockProduct = (id: number, name: string) => {
    updateProductMutation.mutate(
      { id, status: "HIDDEN" },
      {
        onSuccess: () =>
          addNotification(`Đã KHÓA/GỠ sản phẩm "${name}" khỏi sàn bán lẻ.`),
      },
    );
  };

  const handleUnlockProduct = (id: number, name: string) => {
    updateProductMutation.mutate(
      { id, status: "APPROVED" },
      {
        onSuccess: () =>
          addNotification(`Đã MỞ KHÓA/KÍCH HOẠT lại sản phẩm "${name}".`),
      },
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-black uppercase">
            Quản lý & Kiểm duyệt sản phẩm
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Duyệt sản phẩm mới hoặc quản lý / gỡ bỏ các sản phẩm vi phạm chính sách
          </p>
        </div>
        {/* Search input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm hoặc shop..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-black rounded-xl py-2 px-4 pr-10 text-xs font-bold focus:outline-none"
          />
          <Search size={16} className="absolute right-3 top-3 text-gray-400" />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[
          {
            id: "pending",
            label: `Chờ phê duyệt (${pendingProducts?.length || 0})`,
          },
          {
            id: "active",
            label: `Đang hoạt động (${activeProducts?.filter((p: any) => p.approval_status === "APPROVED").length || 0})`,
          },
          {
            id: "blocked",
            label: `Đang bị khóa (${activeProducts?.filter((p: any) => p.approval_status === "HIDDEN" || p.approval_status === "REJECTED").length || 0})`,
          },
        ].map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setProductSubTab(subTab.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
              productSubTab === subTab.id
                ? "bg-black text-white shadow-subtle"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {/* Loader */}
      {isPendingProductsLoading || isActiveProductsLoading ? (
        <div className="flex justify-center py-20 bg-white border-2 border-black rounded-[2.5rem]">
          <Loader2 className="animate-spin text-primary" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* SUBTAB 1: PENDING FOR APPROVAL */}
          {productSubTab === "pending" && (
            <>
              {!pendingProducts || pendingProducts.length === 0 ? (
                <div className="bg-white border-2 border-black rounded-[2.5rem] p-20 flex flex-col items-center text-center">
                  <CheckCircle2 className="text-green-500 mb-4" size={48} />
                  <h3 className="text-xl font-black uppercase">
                    Hoàn tất kiểm duyệt
                  </h3>
                  <p className="text-xs text-gray-500 font-bold mt-1 uppercase">
                    Hiện tại không còn sản phẩm nào đang chờ phê duyệt.
                  </p>
                </div>
              ) : (
                pendingProducts
                  .filter(
                    (p: any) =>
                      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.shop?.shop_name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((product: any) => {
                    const primaryImg =
                      product.images?.find((img: any) => img.is_primary)?.image_url ||
                      product.images?.[0]?.image_url ||
                      "/placeholder.jpg";
                    return (
                      <div
                        key={product.id}
                        className="bg-white border-2 border-black rounded-[1.5rem] p-6 shadow-sm hover:shadow-subtle transition-all"
                      >
                        <div className="flex items-center gap-8">
                          <div className="w-20 h-24 bg-gray-50 rounded-xl overflow-hidden border border-black/5 shrink-0">
                            <img
                              src={
                                primaryImg.startsWith("http")
                                  ? primaryImg
                                  : `${API_URL}${primaryImg}`
                              }
                              className="w-full h-full object-cover"
                              alt={product.name}
                            />
                          </div>

                          <div className="flex-grow grid grid-cols-5 gap-8 items-center">
                            <div className="col-span-2">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Store size={12} /> Gian hàng: {product.shop?.shop_name}
                              </p>
                              <h4 className="text-lg font-black uppercase tracking-tight truncate">
                                {product.name}
                              </h4>
                              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                                SKU: {product.slug || product.id} | Danh mục ID: {product.category_id}
                              </p>
                            </div>

                            <div className="col-span-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Giá dự kiến
                              </p>
                              <p className="text-base font-black">
                                {Number(product.price).toLocaleString()}₫
                              </p>
                            </div>

                            <div className="col-span-2 flex items-center justify-end gap-3">
                              <button
                                onClick={() => handleRejectProduct(product.id, product.name)}
                                disabled={updateProductMutation.isPending}
                                className="px-4 py-2.5 border-2 border-black rounded-xl text-red-600 bg-white font-black text-[10px] uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 shadow-subtle active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                              >
                                <X size={14} /> Từ chối
                              </button>
                              <button
                                onClick={() => handleApproveProduct(product.id, product.name)}
                                disabled={updateProductMutation.isPending}
                                className="px-4 py-2.5 border-2 border-black rounded-xl text-white bg-black font-black text-[10px] uppercase tracking-wider hover:bg-green-500 hover:text-white transition-all flex items-center gap-1.5 shadow-subtle active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                              >
                                <Check size={14} /> Phê duyệt
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </>
          )}

          {/* SUBTAB 2: ACTIVE PRODUCTS */}
          {productSubTab === "active" && (
            <>
              {activeProducts?.filter((p: any) => p.approval_status === "APPROVED").length === 0 ? (
                <div className="bg-white border-2 border-black rounded-[2.5rem] p-16 flex flex-col items-center text-center">
                  <AlertTriangle className="text-amber-500 mb-4" size={48} />
                  <h3 className="text-xl font-black uppercase">
                    Không có sản phẩm nào
                  </h3>
                  <p className="text-xs text-gray-500 font-bold mt-1 uppercase">
                    Hiện tại không có sản phẩm nào đang hoạt động trên sàn.
                  </p>
                </div>
              ) : (
                activeProducts
                  ?.filter((p: any) => p.approval_status === "APPROVED")
                  .filter(
                    (p: any) =>
                      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.shop?.shop_name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((product: any) => {
                    const primaryImg =
                      product.images?.find((img: any) => img.is_primary)?.image_url ||
                      product.images?.[0]?.image_url ||
                      "/placeholder.jpg";
                    return (
                      <div
                        key={product.id}
                        className="bg-white border-2 border-black rounded-[1.5rem] p-6 shadow-sm hover:shadow-subtle transition-all"
                      >
                        <div className="flex items-center gap-8">
                          <div className="w-20 h-24 bg-gray-50 rounded-xl overflow-hidden border border-black/5 shrink-0">
                            <img
                              src={
                                primaryImg.startsWith("http")
                                  ? primaryImg
                                  : `${API_URL}${primaryImg}`
                              }
                              className="w-full h-full object-cover"
                              alt={product.name}
                            />
                          </div>

                          <div className="flex-grow grid grid-cols-5 gap-8 items-center">
                            <div className="col-span-2">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Store size={12} /> Gian hàng: {product.shop?.shop_name}
                              </p>
                              <h4 className="text-lg font-black uppercase tracking-tight truncate">
                                {product.name}
                              </h4>
                              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                                SKU: {product.slug || product.id} | Trạng thái: Đang bán
                              </p>
                            </div>

                            <div className="col-span-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Giá bán
                              </p>
                              <p className="text-base font-black">
                                {Number(product.price).toLocaleString()}₫
                              </p>
                            </div>

                            <div className="col-span-2 flex items-center justify-end">
                              <button
                                onClick={() => handleLockProduct(product.id, product.name)}
                                disabled={updateProductMutation.isPending}
                                className="px-5 py-2.5 border-2 border-black rounded-xl text-red-600 bg-white font-black text-[10px] uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all flex items-center gap-1.5 shadow-subtle active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                              >
                                <Lock size={14} /> Khóa / Gỡ sản phẩm
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </>
          )}

          {/* SUBTAB 3: BLOCKED PRODUCTS */}
          {productSubTab === "blocked" && (
            <>
              {activeProducts?.filter(
                (p: any) => p.approval_status === "HIDDEN" || p.approval_status === "REJECTED",
              ).length === 0 ? (
                <div className="bg-white border-2 border-black rounded-[2.5rem] p-16 flex flex-col items-center text-center">
                  <CheckCircle2 className="text-green-500 mb-4" size={48} />
                  <h3 className="text-xl font-black uppercase">
                    Không có sản phẩm bị khóa
                  </h3>
                  <p className="text-xs text-gray-500 font-bold mt-1 uppercase">
                    Hệ thống hiện tại không có sản phẩm bị khóa hoặc bị từ chối.
                  </p>
                </div>
              ) : (
                activeProducts
                  ?.filter((p: any) => p.approval_status === "HIDDEN" || p.approval_status === "REJECTED")
                  .filter(
                    (p: any) =>
                      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.shop?.shop_name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((product: any) => {
                    const primaryImg =
                      product.images?.find((img: any) => img.is_primary)?.image_url ||
                      product.images?.[0]?.image_url ||
                      "/placeholder.jpg";
                    return (
                      <div
                        key={product.id}
                        className="bg-white border-2 border-black rounded-[1.5rem] p-6 shadow-sm hover:shadow-subtle transition-all"
                      >
                        <div className="flex items-center gap-8">
                          <div className="w-20 h-24 bg-gray-50 rounded-xl overflow-hidden border border-black/5 shrink-0">
                            <img
                              src={
                                primaryImg.startsWith("http")
                                  ? primaryImg
                                  : `${API_URL}${primaryImg}`
                              }
                              className="w-full h-full object-cover"
                              alt={product.name}
                            />
                          </div>

                          <div className="flex-grow grid grid-cols-5 gap-8 items-center">
                            <div className="col-span-2">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Store size={12} /> Gian hàng: {product.shop?.shop_name}
                              </p>
                              <h4 className="text-lg font-black uppercase tracking-tight truncate text-gray-400">
                                {product.name}
                              </h4>
                              <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">
                                Trạng thái: BỊ KHÓA ({product.approval_status})
                              </p>
                            </div>

                            <div className="col-span-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Giá cũ
                              </p>
                              <p className="text-base font-bold text-gray-400">
                                {Number(product.price).toLocaleString()}₫
                              </p>
                            </div>

                            <div className="col-span-2 flex items-center justify-end">
                              <button
                                onClick={() => handleUnlockProduct(product.id, product.name)}
                                disabled={updateProductMutation.isPending}
                                className="px-5 py-2.5 border-2 border-black rounded-xl text-green-600 bg-white font-black text-[10px] uppercase tracking-wider hover:bg-green-600 hover:text-white transition-all flex items-center gap-1.5 shadow-subtle active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                              >
                                <Unlock size={14} /> Mở khóa sản phẩm
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
