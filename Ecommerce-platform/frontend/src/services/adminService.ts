import { axiosClient } from "@/shared/api/axiosClient";

// ============================================================
// 1. QUẢN LÝ TÀI KHOẢN MANAGER
// ============================================================

export const adminService = {
  // Tạo Manager mới (tương thích ngược)
  createManager: async (data: { email: string; password?: string; full_name?: string }) => {
    const response = await axiosClient.post("/admin/users", { 
      ...data, 
      role: "manager", 
      password: data.password || "uteshop_manager" 
    });
    return response.data;
  },

  // Tạo User mới (Customer, Vendor, Shipper, Manager)
  createUser: async (data: { email: string; password?: string; full_name?: string; role: string; phone?: string; gender?: string; shipper_shop_id?: string | number }) => {
    const payload: any = { ...data };
    if (data.role !== "shipper" && !data.password) {
      payload.password = "uteshop_123456";
    }
    const response = await axiosClient.post("/admin/users", payload);
    return response.data;
  },

  // Lấy danh sách users theo role
  getUsersByRole: async (role: string) => {
    const response = await axiosClient.get(`/admin/users?role=${role}`);
    return response.data;
  },

  // Cập nhật thông tin tài khoản (bao gồm cả Admin và các User khác)
  updateUser: async (id: number | string, data: any) => {
    const response = await axiosClient.put(`/admin/users/${id}`, data);
    return response.data;
  },

  // Khóa tài khoản User
  lockUser: async (id: number | string) => {
    const response = await axiosClient.put(`/admin/users/${id}/lock`);
    return response.data;
  },

  // Mở khóa tài khoản User
  unlockUser: async (id: number | string) => {
    const response = await axiosClient.put(`/admin/users/${id}/unlock`);
    return response.data;
  },

  // ============================================================
  // 2. PHÊ DUYỆT / TỪ CHỐI GIAN HÀNG
  // ============================================================

  // Danh sách shops (có filter status)
  getShops: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await axiosClient.get("/admin/shops", { params });
    return response.data;
  },

  // Shops chờ duyệt
  getPendingShops: async () => {
    const response = await axiosClient.get("/admin/shops/pending");
    return response.data;
  },

  // Phê duyệt shop
  approveShop: async (id: number | string) => {
    const response = await axiosClient.put(`/admin/shops/${id}/approve`);
    return response.data;
  },

  // Từ chối shop (kèm lý do)
  rejectShop: async (id: number | string, reason: string) => {
    const response = await axiosClient.put(`/admin/shops/${id}/reject`, { reason });
    return response.data;
  },

  // ============================================================
  // 3. CẤU HÌNH HỆ THỐNG
  // ============================================================

  // Lấy tất cả cấu hình
  getSettings: async () => {
    const response = await axiosClient.get("/admin/settings");
    return response.data;
  },

  // Cập nhật một cấu hình
  updateSetting: async (key: string, value: string) => {
    const response = await axiosClient.put(`/admin/settings/${key}`, { value });
    return response.data;
  },

  // Danh mục
  getCategories: async () => {
    const response = await axiosClient.get("/admin/categories");
    return response.data;
  },

  createCategory: async (data: { name: string; description?: string; parent_id?: number | null; image_url?: string }) => {
    const response = await axiosClient.post("/admin/categories", data);
    return response.data;
  },

  updateCategory: async (id: number | string, data: { name?: string; description?: string; is_active?: number }) => {
    const response = await axiosClient.put(`/admin/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: number | string) => {
    const response = await axiosClient.delete(`/admin/categories/${id}`);
    return response.data;
  },

  // ============================================================
  // 4. BÁO CÁO TÀI CHÍNH
  // ============================================================

  getFinancialReport: async (from?: string, to?: string, groupBy?: string, shopMonth?: number, shopYear?: number) => {
    const params: Record<string, any> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (groupBy) params.groupBy = groupBy;
    if (shopMonth) params.shopMonth = shopMonth;
    if (shopYear) params.shopYear = shopYear;
    const response = await axiosClient.get("/admin/financial-report", { params });
    return response.data;
  },

  // ============================================================
  // 5. ĐỐI SOÁT THANH TOÁN
  // ============================================================

  getReconciliation: async () => {
    const response = await axiosClient.get("/admin/reconciliation");
    return response.data;
  },

  approvePayout: async (id: number | string) => {
    const response = await axiosClient.put(`/admin/payouts/${id}/approve`);
    return response.data;
  },

  rejectPayout: async (id: number | string, reason?: string) => {
    const response = await axiosClient.put(`/admin/payouts/${id}/reject`, { reason });
    return response.data;
  },

  getPendingShipperReconciliations: async () => {
    const response = await axiosClient.get("/admin/shipper-reconciliations");
    return response.data;
  },

  approveShipperReconciliation: async (id: number | string) => {
    const response = await axiosClient.put(`/admin/shipper-reconciliations/${id}/approve`);
    return response.data;
  },

  rejectShipperReconciliation: async (id: number | string, reason?: string) => {
    const response = await axiosClient.put(`/admin/shipper-reconciliations/${id}/reject`, { reason });
    return response.data;
  },

  getShopWallets: async () => {
    const response = await axiosClient.get("/admin/shop-wallets");
    return response.data;
  },

  disburseShopWallet: async (id: number | string) => {
    const response = await axiosClient.post(`/admin/shop-wallets/${id}/disburse`);
    return response.data;
  },

  // ============================================================
  // 6. LỊCH SỬ THANH TOÁN
  // ============================================================

  getPaymentLogs: async (page = 1, limit = 20, filters?: { gateway_name?: string; status?: string; search?: string; from_date?: string; to_date?: string }) => {
    const params: Record<string, string | number> = { page, limit };
    if (filters?.gateway_name) params.gateway_name = filters.gateway_name;
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    if (filters?.from_date) params.from_date = filters.from_date;
    if (filters?.to_date) params.to_date = filters.to_date;
    const response = await axiosClient.get("/admin/payment-logs", { params });
    return response.data;
  },

  getWithdrawalLogs: async (page = 1, limit = 20, filters?: { status?: string; search?: string; from_date?: string; to_date?: string }) => {
    const params: Record<string, string | number> = { page, limit };
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    if (filters?.from_date) params.from_date = filters.from_date;
    if (filters?.to_date) params.to_date = filters.to_date;
    const response = await axiosClient.get("/admin/withdrawal-logs", { params });
    return response.data;
  },

  // ============================================================
  // 7. QUẢN LÝ ĐƠN HÀNG
  // ============================================================
  getOrderByCode: async (code: string) => {
    const response = await axiosClient.get(`/admin/orders/by-code/${code}`);
    return response.data;
  },

  // ============================================================
  // 8. NHẬT KÝ HỆ THỐNG
  // ============================================================
  getActivityLogs: async (page = 1, limit = 20, filters?: { action_type?: string; entity_type?: string; search?: string; from_date?: string; to_date?: string }) => {
    const params: Record<string, string | number> = { page, limit };
    if (filters?.action_type) params.action_type = filters.action_type;
    if (filters?.entity_type) params.entity_type = filters.entity_type;
    if (filters?.search) params.search = filters.search;
    if (filters?.from_date) params.from_date = filters.from_date;
    if (filters?.to_date) params.to_date = filters.to_date;
    const response = await axiosClient.get("/admin/activity-logs", { params });
    return response.data;
  },
};

