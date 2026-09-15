import { axiosClient, publicAxios } from "@/shared/api/axiosClient";
import { ReturnListResponse, ReturnRequest } from "@/shared/types/return.types";

export interface ShopRegistrationData {
  name: string;
  phone: string;
  address: string;
  industry: string;
  description?: string;
}

export interface ShopProfileData extends ShopRegistrationData {
  id: number;
  user_id: number;
  avatar_url?: string;
  shop_logo?: string;
  shop_name?: string;
  cover_url?: string;
  rating: number;
  followers_count: number;
  response_rate: number;
  status: string;
  reject_reason?: string;
  created_at?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_name?: string;
}

export interface ProductData {
  approval_status?: string;
  name: string;
  category_id: number;
  brand_id?: number;
  description?: string;
  price: number;
  sale_price?: number;
  gender?: string;
  material?: string;
  stock_quantity?: number;
  is_new?: boolean;
  is_featured?: boolean;
  variants?: Array<{
    size: string;
    color: string;
    color_hex?: string;
    image_url?: string;
    price: number;
    sale_price?: number;
    stock_quantity: number;
  }>;
  images?: Array<{
    image_url: string;
  }>;
}

export interface VoucherData {
  code: string;
  description?: string;
  discount_type?: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number;
  category_id?: string | number;
  min_order_amount?: number;
  max_discount?: number;
  usage_limit?: number;
  per_user_limit?: number;
  start_date?: string;
  end_date?: string;
}

export const vendorService = {
  // Đăng ký shop
  registerShop: async (data: ShopRegistrationData) => {
    const response = await axiosClient.post("/shops", data);
    return response.data;
  },

  // Lấy thông tin shop của tôi
  getMyShopInfo: async () => {
    const response = await axiosClient.get("/shops/my-shop/info");
    return response.data;
  },

  // Cập nhật thông tin shop của tôi
  updateMyShopInfo: async (data: Partial<ShopProfileData>) => {
    const response = await axiosClient.put("/shops/my-shop/info", data);
    return response.data;
  },

  // Lấy thống kê của shop
  getShopStatistics: async () => {
    const response = await axiosClient.get("/shops/my-shop/statistics");
    return response.data;
  },

  // Lấy danh sách đơn hàng chứa sản phẩm của shop
  getShopOrders: async () => {
    const response = await axiosClient.get("/shops/my-shop/orders");
    return response.data;
  },

  // Lấy danh sách đánh giá/bình luận của shop
  getShopReviews: async () => {
    const response = await axiosClient.get("/shops/my-shop/reviews");
    return response.data;
  },

  // Xác nhận đơn hàng (PENDING -> CONFIRMED)
  confirmOrder: async (orderId: number | string) => {
    const response = await axiosClient.patch(`/orders/${orderId}/status`, { status: "CONFIRMED" });
    return response.data;
  },

  // Hủy đơn hàng (Vendor)
  cancelOrder: async (orderId: number | string, note?: string) => {
    const response = await axiosClient.patch(`/orders/${orderId}/status`, { status: "CANCELLED", note: note || "Shop từ chối đơn hàng" });
    return response.data;
  },

  // Quản lý sản phẩm
  createProduct: async (data: ProductData) => {
    const response = await axiosClient.post("/shops/my-shop/products", data);
    return response.data;
  },

  updateProduct: async (id: number | string, data: Partial<ProductData>) => {
    const response = await axiosClient.put(`/shops/my-shop/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id: number | string) => {
    const response = await axiosClient.delete(`/shops/my-shop/products/${id}`);
    return response.data;
  },

  // Lấy sản phẩm của shop (Phía Client/Public)
  getShopProducts: async (shopId: number | string, params: any = {}) => {
    const response = await publicAxios.get("/products", {
      params: { ...params, shopId },
    });
    return response.data;
  },

  // Lấy sản phẩm quản lý của shop (Phía Vendor/Private)
  getMyShopProducts: async (params: any = {}) => {
    const response = await axiosClient.get("/shops/my-shop/products", {
      params,
    });
    return response.data;
  },

  // Quản lý khuyến mãi
  createVoucher: async (data: VoucherData) => {
    const response = await axiosClient.post("/shops/my-shop/vouchers", data);
    return response.data;
  },

  deleteVoucher: async (id: number | string) => {
    const response = await axiosClient.delete(`/shops/my-shop/vouchers/${id}`);
    return response.data;
  },

  getShopVouchers: async (shopId: number | string) => {
    const response = await publicAxios.get(`/shops/${shopId}/vouchers`);
    return response.data;
  },

  getShopProfile: async (shopId: number | string) => {
    const response = await publicAxios.get(`/shops/${shopId}`);
    return response.data;
  },

  getTopShops: async (limit: number = 10) => {
    const response = await publicAxios.get(`/shops/top?limit=${limit}`);
    return response.data;
  },

  getAllShops: async (params: { search?: string; page?: number; limit?: number }) => {
    const response = await publicAxios.get("/shops", { params });
    return response.data;
  },

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await axiosClient.post("/shops/my-shop/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Chuẩn bị hàng (CONFIRMED -> PREPARING)
  prepareOrder: async (orderId: number | string) => {
    const response = await axiosClient.patch(`/orders/${orderId}/status`, { status: "PREPARING" });
    return response.data;
  },

  // Sẵn sàng giao hàng (PREPARING -> SHIPPING)
  readyOrder: async (orderId: number | string) => {
    const response = await axiosClient.patch(`/orders/${orderId}/status`, { status: "SHIPPING" });
    return response.data;
  },

  // Xác nhận nhận hàng hoàn (RETURN_PENDING -> RETURNED)
  confirmReturn: async (orderId: number | string) => {
    const response = await axiosClient.patch(`/orders/${orderId}/status`, { status: "RETURNED" });
    return response.data;
  },

  // Cập nhật trạng thái hàng loạt
  bulkUpdateOrdersStatus: async (orderIds: (number | string)[], status: string) => {
    const response = await axiosClient.patch("/orders/bulk-status", { orderIds, status });
    return response.data;
  },

  // Tạo yêu cầu rút tiền
  requestWithdrawal: async (data: { amount: number; bank_name: string; account_number: string; account_name: string }) => {
    const response = await axiosClient.post("/shops/my-shop/withdraw", data);
    return response.data;
  },

  // Lấy lịch sử yêu cầu rút tiền
  getWithdrawalHistory: async () => {
    const response = await axiosClient.get("/shops/my-shop/withdrawals");
    return response.data;
  },

  // Lấy lịch sử tin nhắn chat
  getChatHistory: async (partnerId: number | string) => {
    const response = await axiosClient.get(`/chats/messages/${partnerId}`);
    return response.data;
  },

  // Trả lời bình luận
  replyToReview: async (reviewId: number | string, vendor_reply: string) => {
    const response = await axiosClient.post(`/shops/my-shop/reviews/${reviewId}/reply`, { vendor_reply });
    return response.data;
  },

  // Gửi tin nhắn chat
  sendMessage: async (receiverId: number | string, content: string) => {
    const response = await axiosClient.post("/chats/messages", { receiverId, content });
    return response.data;
  },

  getShopReturnRequests: async (page = 1, limit = 10, status = "ALL") => {
    const response = await axiosClient.get("/shops/my-shop/returns", { params: { page, limit, status } });
    return response.data.data as ReturnListResponse;
  },

  approveReturnRequest: async (id: number) => {
    const response = await axiosClient.post(`/shops/my-shop/returns/${id}/approve`);
    return response.data.data as ReturnRequest;
  },

  rejectReturnRequest: async (id: number, rejectNote: string) => {
    const response = await axiosClient.post(`/shops/my-shop/returns/${id}/reject`, { rejectNote });
    return response.data.data as ReturnRequest;
  },
};

export default vendorService;
