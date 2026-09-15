import { axiosClient } from "@/shared/api/axiosClient";

export const managerService = {
  getStats: async () => {
    const response = await axiosClient.get("/manager/stats");
    return response.data.data;
  },
  getPendingProducts: async () => {
    const response = await axiosClient.get("/manager/products/pending");
    return response.data.data;
  },
  getActiveProducts: async () => {
    const response = await axiosClient.get("/manager/products/active");
    return response.data.data;
  },
  updateProductStatus: async (id: number, status: string) => {
    const response = await axiosClient.put(`/manager/products/${id}/status`, { status });
    return response.data.data;
  },
  getDisputes: async () => {
    const response = await axiosClient.get("/manager/disputes");
    return response.data.data;
  },
  resolveDispute: async (id: number, status: string) => {
    const response = await axiosClient.put(`/manager/disputes/${id}/resolve`, { status });
    return response.data.data;
  },
  getVouchers: async () => {
    const response = await axiosClient.get("/manager/vouchers");
    return response.data.data;
  },
  createVoucher: async (payload: {
    code: string;
    discount_type: "PERCENT" | "FIXED";
    discount_value: number;
    max_discount?: number | null;
    min_order_amount: number;
    usage_limit?: number | null;
    start_date: string;
    end_date: string;
  }) => {
    const response = await axiosClient.post("/manager/vouchers", payload);
    return response.data.data;
  },
  deleteVoucher: async (id: number) => {
    const response = await axiosClient.delete(`/manager/vouchers/${id}`);
    return response.data.data;
  },
  getCampaigns: async () => {
    const response = await axiosClient.get("/manager/campaigns");
    return response.data.data;
  },
  createCampaign: async (payload: { title: string; type: string; date: string }) => {
    const response = await axiosClient.post("/manager/campaigns", payload);
    return response.data.data;
  },
  getVendors: async () => {
    const response = await axiosClient.get("/manager/vendors");
    return response.data.data;
  },
  updateVendorStatus: async (id: number, status: string, reason?: string) => {
    const response = await axiosClient.put(`/manager/vendors/${id}/status`, { status, reason });
    return response.data.data;
  },
  getReturnRequests: async (page = 1, limit = 10, status = "ALL") => {
    const response = await axiosClient.get("/manager/returns", { params: { page, limit, status } });
    return response.data.data;
  },
  resolveReturnRequest: async (id: number, approved: boolean, resolveNote: string) => {
    const response = await axiosClient.post(`/manager/returns/${id}/resolve`, { approved, resolveNote });
    return response.data.data;
  },
  getReviews: async () => {
    const response = await axiosClient.get("/manager/reviews");
    return response.data.data;
  },
  deleteReview: async (id: number) => {
    const response = await axiosClient.delete(`/manager/reviews/${id}`);
    return response.data.data;
  },
  getReportOverview: async (month?: number, year?: number) => {
    const response = await axiosClient.get("/manager/reports/overview", {
      params: { month, year }
    });
    return response.data.data;
  },
  getBlogs: async (params?: { category?: string; search?: string }) => {
    const response = await axiosClient.get("/blogs", { params });
    return response.data.data;
  },
  getBlogBySlug: async (slug: string) => {
    const response = await axiosClient.get(`/blogs/${slug}`);
    return response.data.data;
  },
  getManagerBlogs: async () => {
    const response = await axiosClient.get("/manager/blogs");
    return response.data.data;
  },
  createBlog: async (payload: any) => {
    const response = await axiosClient.post("/manager/blogs", payload);
    return response.data.data;
  },
  updateBlog: async (id: number | string, payload: any) => {
    const response = await axiosClient.put(`/manager/blogs/${id}`, payload);
    return response.data.data;
  },
  deleteBlog: async (id: number | string) => {
    const response = await axiosClient.delete(`/manager/blogs/${id}`);
    return response.data;
  },
  uploadBlogImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await axiosClient.post("/manager/blogs/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
export default managerService;
