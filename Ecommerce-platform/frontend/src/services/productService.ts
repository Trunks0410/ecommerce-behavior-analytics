import {
  Product,
  ProductFilters,
  ProductListResponse,
} from "@/shared/types/product.types";
import { axiosClient, publicAxios } from "@/shared/api/axiosClient";

const productService = {
  // Lấy danh sách sản phẩm với bộ lọc
  getProducts: async (filters: ProductFilters) => {
    // Lọc bỏ các tham số undefined/null
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v != null),
    );
    const response = await publicAxios.get("/products", {
      params: cleanFilters,
    });
    return response.data.data as ProductListResponse;
  },

  // Gợi ý tìm kiếm nhanh (Autocomplete)
  getProductSuggestions: async (q: string, limit = 6) => {
    const response = await publicAxios.get("/products/suggestions", {
      params: { q, limit },
    });
    return response.data.data as { products: Product[]; total: number };
  },

  // Lấy chi tiết sản phẩm
  getProductBySlug: async (slug: string) => {
    const response = await publicAxios.get(`/products/${slug}`);
    return response.data.data as Product;
  },

  // Lấy sản phẩm nổi bật
  getFeaturedProducts: async (limit = 10) => {
    const response = await publicAxios.get("/products/featured", {
      params: { limit },
    });
    return response.data.data as Product[];
  },

  // Lấy sản phẩm mới nhất
  getNewestProducts: async (limit = 10) => {
    const response = await publicAxios.get("/products/newest", {
      params: { limit },
    });
    return response.data.data as Product[];
  },

  // Lấy sản phẩm bán chạy nhất
  getBestSellerProducts: async (limit = 10) => {
    const response = await publicAxios.get("/products/best-sellers", {
      params: { limit },
    });
    return response.data.data as Product[];
  },

  // Lấy sản phẩm xem nhiều nhất
  getMostViewedProducts: async (limit = 10) => {
    const response = await publicAxios.get("/products/most-viewed", {
      params: { limit },
    });
    return response.data.data as Product[];
  },

  // Lấy sản phẩm tương tự
  getSimilarProducts: async (slug: string) => {
    const response = await publicAxios.get(`/products/${slug}/similar`);
    return response.data.data as Product[];
  },

  // Lấy key lưu lịch sử xem theo từng user (tránh rò rỉ dữ liệu giữa các tài khoản & khách)
  getRecentViewedStorageKey: (userId?: number | string | null): string =>
    userId ? `meemart_recent_viewed_ids_user_${userId}` : "meemart_recent_viewed_ids_guest",

  // Lấy lịch sử ID sản phẩm vừa xem gần đây trong trình duyệt theo đúng tài khoản
  getRecentViewedIds: (userId?: number | string | null): number[] => {
    try {
      const key = productService.getRecentViewedStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map(Number).filter((n) => !isNaN(n) && n > 0).slice(0, 15)
        : [];
    } catch {
      return [];
    }
  },

  // Lấy sản phẩm cá nhân hóa theo lịch sử xem (UserViewedProduct + viewedIds của đúng user)
  getRecommendedProducts: async (limit: number = 12, userId?: number | string | null) => {
    const viewedIds = productService.getRecentViewedIds(userId);
    const params: Record<string, any> = { limit };
    if (viewedIds.length > 0) {
      params.viewedIds = viewedIds.join(",");
    }
    if (userId) {
      try {
        const response = await axiosClient.get("/products/recommendations", { params });
        return response.data.data as Product[];
      } catch {
        // Fallback nếu token hết hạn
      }
    }
    const response = await publicAxios.get("/products/recommendations", { params });
    return response.data.data as Product[];
  },

  // Toggle Favorite
  toggleFavorite: async (productId: number) => {
    const response = await axiosClient.post(`/products/${productId}/favorite`);
    return response.data;
  },

  // Record View
  recordView: async (productId: number, userId?: number | string | null) => {
    try {
      const idNum = Number(productId);
      if (idNum > 0) {
        const key = productService.getRecentViewedStorageKey(userId);
        const current = productService.getRecentViewedIds(userId).filter((id) => id !== idNum);
        localStorage.setItem(
          key,
          JSON.stringify([idNum, ...current].slice(0, 15))
        );
      }
    } catch {
      // ignore storage errors
    }

    try {
      const response = await axiosClient.post(`/products/${productId}/view`);
      return response.data;
    } catch (e) {
      // Fallback for not logged in
      const response = await publicAxios.post(`/products/${productId}/view`);
      return response.data;
    }
  },
};

export default productService;
