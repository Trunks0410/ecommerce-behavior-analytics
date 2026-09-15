import { axiosClient, publicAxios } from "@/shared/api/axiosClient";

const reviewService = {
  createReview: async (productId: number, payload: { order_id: number; variant_id?: number | null; rating: number; comment: string; images?: string[] }) => {
    const response = await axiosClient.post(`/products/${productId}/reviews`, payload);
    return response.data;
  },

  updateReview: async (productId: number, payload: { order_id: number; rating: number; comment: string; images?: string[] }) => {
    const response = await axiosClient.put(`/products/${productId}/reviews`, payload);
    return response.data;
  },

  getProductReviews: async (productId: number, page = 1, limit = 10) => {
    const response = await publicAxios.get(`/products/${productId}/reviews`, { params: { page, limit } });
    return response.data.data;
  },
};

export default reviewService;
