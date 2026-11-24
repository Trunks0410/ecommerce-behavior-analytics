import axios from "axios";

/**
 * Vector Search Client dành cho Ecommerce Main Platform
 * Toàn bộ logic nạp vector, cosine similarity và reranking đã được tách
 * hoàn toàn sang Analytics & Search Microservice (Port 8088).
 */
class VectorSearchClient {
  constructor() {
    this.serviceUrl = (
      process.env.ANALYTICS_SERVICE_URL ||
      process.env.VECTOR_SERVICE_URL ||
      "http://localhost:8088"
    ).replace(/\/+$/, "");

    this.timeoutMs = Number(process.env.ANALYTICS_SERVICE_TIMEOUT_MS) || 5000;
    this.isAvailable = false;
    this.lastHealthCheck = null;
  }

  getMode() {
    return "microservice";
  }

  async setMode(mode) {
    return this.getStatus();
  }

  /**
   * Kiểm tra tình trạng kết nối tới Analytics & Search Service
   */
  async checkServiceHealth() {
    try {
      const response = await axios.get(`${this.serviceUrl}/health`, {
        timeout: 3000,
      });

      if (response.status === 200 && response.data?.status === "UP") {
        this.isAvailable = true;
        this.lastHealthCheck = Date.now();
        console.log(
          `✅ [SEARCH CLIENT] Đã kết nối tới Analytics & Search Microservice (${this.serviceUrl}) | Model: ${
            response.data.model || "Multimodal Vector Model"
          } | Vectors: ${response.data.total_vectors ?? "N/A"}`
        );
        return true;
      }
    } catch (error) {
      this.isAvailable = false;
      console.warn(
        `⚠️ [SEARCH CLIENT] Chưa kết nối được tới Analytics & Search Service (${this.serviceUrl}): ${error.message}. Hệ thống sẽ tự động fallback sang SQL query.`
      );
    }
    return false;
  }

  init() {
    this.checkServiceHealth();
  }

  isReady() {
    return this.isAvailable;
  }

  async getStatus() {
    try {
      const response = await axios.get(`${this.serviceUrl}/health`, {
        timeout: 3000,
      });
      return {
        mode: "microservice",
        ready: response.data?.status === "UP",
        serviceUrl: this.serviceUrl,
        ...response.data,
      };
    } catch (error) {
      return {
        mode: "microservice",
        ready: false,
        serviceUrl: this.serviceUrl,
        error: error.message,
      };
    }
  }

  /**
   * Gửi từ khóa sang Analytics Service để tìm kiếm bằng Vector & Reranker
   * @param {string} keyword
   * @param {number} limit
   * @returns {Promise<number[]>}
   */
  async searchProductsBySemantic(keyword, limit = 20) {
    if (!keyword || typeof keyword !== "string") return [];

    try {
      const response = await axios.get(`${this.serviceUrl}/api/v1/search/search`, {
        params: { query: keyword, limit },
        timeout: this.timeoutMs,
      });

      if (Array.isArray(response.data?.productIds)) {
        return response.data.productIds;
      }
    } catch (error) {
      console.warn(
        `⚠️ [SEARCH CLIENT] Lỗi gọi Analytics Search API (${error.message}). Tự động fallback sang SQL LIKE.`
      );
    }
    return [];
  }

  /**
   * Lấy danh sách ID sản phẩm tương tự từ Analytics Service
   * @param {number} productId
   * @param {number} limit
   * @returns {Promise<number[]>}
   */
  async getSimilarProductIds(productId, limit = 6) {
    if (!productId) return [];

    try {
      const response = await axios.get(
        `${this.serviceUrl}/api/v1/search/similar/${productId}`,
        {
          params: { limit },
          timeout: this.timeoutMs,
        }
      );

      if (Array.isArray(response.data?.productIds)) {
        return response.data.productIds;
      }
    } catch (error) {
      console.warn(
        `⚠️ [SEARCH CLIENT] Lỗi lấy sản phẩm tương tự từ Analytics Service (${error.message}).`
      );
    }
    return [];
  }

  /**
   * Đề xuất sản phẩm theo hành vi người dùng từ Analytics Service
   * @param {number[]} viewedProductIds
   * @param {number} limit
   * @returns {Promise<number[]>}
   */
  async getRecommendationsByUserHistory(viewedProductIds, limit = 10, signalWeights = {}) {
    if (!Array.isArray(viewedProductIds) || viewedProductIds.length === 0) return [];

    try {
      const response = await axios.post(
        `${this.serviceUrl}/api/v1/search/user-history`,
        { viewedProductIds, limit, signalWeights },
        { timeout: this.timeoutMs }
      );

      if (Array.isArray(response.data?.productIds)) {
        return response.data.productIds;
      }
    } catch (error) {
      console.warn(
        `⚠️ [SEARCH CLIENT] Lỗi lấy đề xuất cá nhân hóa từ Analytics Service (${error.message}).`
      );
    }
    return [];
  }

  /**
   * Báo cho Analytics Service cập nhật vector sản phẩm
   * @param {number} productId
   */
  async upsertProductVector(productId) {
    if (!productId) return null;

    try {
      const response = await axios.post(
        `${this.serviceUrl}/api/v1/vector/upsert/${productId}`,
        {},
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Báo cho Analytics Service xóa vector sản phẩm
   * @param {number} productId
   */
  async deleteProductVector(productId) {
    if (!productId) return null;

    try {
      const response = await axios.delete(
        `${this.serviceUrl}/api/v1/vector/${productId}`,
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Yêu cầu Analytics Service đồng bộ vector từ Database
   */
  async syncDatabaseVectors() {
    try {
      const response = await axios.post(
        `${this.serviceUrl}/api/v1/vector/sync-db`,
        {},
        { timeout: 60000 }
      );
      return response.data;
    } catch (error) {
      console.warn(`⚠️ [SEARCH CLIENT] Lỗi gửi yêu cầu đồng bộ vector: ${error.message}`);
      return null;
    }
  }
}

const vectorSearchClient = new VectorSearchClient();
export default vectorSearchClient;
