import fs from "fs";
import path from "path";
import zlib from "zlib";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Từ điển đồng nghĩa Việt - Anh hỗ trợ tìm kiếm trên tập dữ liệu Amazon Berkeley Objects
const VI_EN_SYNONYMS = {
  "giày": ["shoes", "sneakers", "boots", "footwear", "heel"],
  "giay": ["shoes", "sneakers", "boots"],
  "dép": ["sandals", "slippers", "slides"],
  "dep": ["sandals", "slippers"],
  "áo": ["shirt", "t-shirt", "jacket", "top", "hoodie"],
  "ao": ["shirt", "t-shirt", "jacket"],
  "váy": ["dress", "skirt"],
  "vay": ["dress", "skirt"],
  "đầm": ["dress"],
  "dam": ["dress"],
  "quần": ["pants", "jeans", "trousers", "shorts"],
  "quan": ["pants", "jeans"],
  "túi": ["bag", "handbag", "backpack", "tote"],
  "tui": ["bag", "handbag"],
  "ví": ["wallet", "purse"],
  "vi": ["wallet", "purse"],
  "mũ": ["hat", "cap"],
  "nón": ["hat", "cap"],
  "đồng hồ": ["watch"],
  "dong ho": ["watch"],
  "đèn": ["lamp", "light"],
  "den": ["lamp", "light"],
  "ghế": ["chair", "stool", "armchair"],
  "ghe": ["chair", "stool"],
  "bàn": ["table", "desk"],
  "ban": ["table", "desk"],
  "trắng": ["white"],
  "trang": ["white"],
  "đen": ["black"],
  "den": ["black"],
  "đỏ": ["red"],
  "do": ["red"],
  "xanh": ["blue", "green"],
  "vàng": ["yellow", "gold"],
  "da": ["leather"],
  "nam": ["men", "mens", "male"],
  "nữ": ["women", "womens", "female", "dames", "mujer"],
  "nu": ["women", "womens"],
};

/**
 * Xác định chế độ chạy Vector Search khi khởi động ứng dụng:
 * - Option 1 ("ram"): Nạp trực tiếp ma trận vector (.npz/.npy) lên RAM của Node.js backend.
 * - Option 2 ("microservice"): Gọi sang Vector AI Microservice độc lập (sử dụng trực tiếp model
 *   Qwen3-VL-Embedding-2B để encode query & kết nối chung DB để tự động cập nhật vector khi cần).
 *
 * Thứ tự ưu tiên cấu hình:
 * 1. CLI argument: `--vector-mode=ram` hoặc `--vector-mode=microservice`
 * 2. Biến môi trường: `VECTOR_SEARCH_MODE=ram` hoặc `VECTOR_SEARCH_MODE=microservice`
 * 3. Mặc định: `"ram"`
 */
function resolveVectorSearchMode() {
  const cliArg = process.argv.find((arg) => arg.startsWith("--vector-mode="));
  if (cliArg) {
    const val = cliArg.split("=")[1]?.trim().toLowerCase();
    if (val === "microservice" || val === "service" || val === "model") {
      return "microservice";
    }
    if (val === "ram" || val === "local" || val === "memory") {
      return "ram";
    }
  }

  const envMode = (process.env.VECTOR_SEARCH_MODE || "ram").trim().toLowerCase();
  if (envMode === "microservice" || envMode === "service" || envMode === "model") {
    return "microservice";
  }
  return "ram";
}

class VectorSearchService {
  constructor() {
    this.mode = resolveVectorSearchMode(); // "ram" | "microservice"
    this.serviceUrl = (process.env.VECTOR_SERVICE_URL || "http://localhost:8095").replace(/\/+$/, "");
    this.serviceTimeoutMs = Number(process.env.VECTOR_SERVICE_TIMEOUT_MS) || 8000;

    // Trạng thái cho Option 1 (RAM) và Fallback
    this.ready = false;
    this.ramReady = false;
    this.microserviceReady = false;
    this.vectors = null; // Float32Array ma trận N x 2048
    this.metadata = null; // Danh sách metadata (title, item_id, sync_index)
    this.totalRecords = 0;
    this.vectorDim = 2048;
  }

  getMode() {
    return this.mode;
  }

  /**
   * Chuyển đổi linh hoạt giữa 2 mode ("ram" | "microservice") ngay khi app đang chạy
   * @param {"ram" | "microservice"} newMode
   */
  async setMode(newMode) {
    const normalized = String(newMode || "").trim().toLowerCase();
    if (normalized === "microservice" || normalized === "service" || normalized === "model") {
      this.mode = "microservice";
      this.ready = true;
      await this.checkMicroserviceHealth();
    } else {
      this.mode = "ram";
      const ok = this.initRamVectors();
      this.ready = ok;
    }
    console.log(`🔀 [VECTOR SEARCH] Đã chuyển chế độ sang: "${this.mode.toUpperCase()}"`);
    return this.getStatus();
  }

  async getStatus() {
    if (this.mode === "microservice") {
      await this.checkMicroserviceHealth();
    }
    return {
      mode: this.mode,
      ready: this.isReady(),
      ramReady: this.ramReady,
      microserviceReady: this.microserviceReady,
      serviceUrl: this.serviceUrl,
      totalRamRecords: this.totalRecords,
      vectorDim: this.vectorDim,
    };
  }

  findFile(filename) {
    const candidatePaths = [
      // Đi từ thư mục gốc của project Ecommerce-platform
      path.resolve(__dirname, `../../../vector-data/${filename}`),
      path.resolve(process.cwd(), `../vector-data/${filename}`),
      path.resolve(process.cwd(), `Ecommerce-platform/vector-data/${filename}`),
      path.resolve(process.cwd(), `vector-data/${filename}`),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Nạp dữ liệu vector trực tiếp vào bộ nhớ RAM (Option 1)
   */
  initRamVectors() {
    if (this.ramReady) return true;

    try {
      // 1. Tìm file vector: ưu tiên embeddings.npy, nếu không có thì đọc trực tiếp product_embeddings.npz
      const npyPath = this.findFile("embeddings.npy");
      const npzPath = this.findFile("product_embeddings.npz");
      const metaPath = this.findFile("product_metadata.json");

      if ((!npyPath && !npzPath) || !metaPath) {
        console.warn("⚠️ [VECTOR SEARCH - RAM] Không tìm thấy product_embeddings.npz hoặc product_metadata.json.");
        return false;
      }

      // 2. Nạp metadata để liên kết từ khóa (Text) với Vector Index (0..N-1)
      const metaRaw = fs.readFileSync(metaPath, "utf-8");
      this.metadata = JSON.parse(metaRaw);
      this.totalRecords = this.metadata.length;

      // 3. Đọc dữ liệu vector nhị phân
      let npyBuffer = null;
      if (npyPath) {
        console.log(`🧠 [VECTOR SEARCH - RAM] Đang nạp ma trận vector từ: ${npyPath}...`);
        npyBuffer = fs.readFileSync(npyPath);
      } else {
        console.log(`🧠 [VECTOR SEARCH - RAM] Đang giải nén trực tiếp ma trận vector từ file nén: ${npzPath}...`);
        const zipBuf = fs.readFileSync(npzPath);
        // Header ZIP tiêu chuẩn: PK\x03\x04
        const nameLen = zipBuf.readUInt16LE(26);
        const extraLen = zipBuf.readUInt16LE(28);
        const dataStart = 30 + nameLen + extraLen;
        npyBuffer = zlib.inflateRawSync(zipBuf.slice(dataStart));
      }

      // Đọc header của numpy .npy format
      const headerLen = npyBuffer.readUInt16LE(8);
      const dataOffset = 10 + headerLen;

      this.vectors = new Float32Array(
        npyBuffer.buffer,
        npyBuffer.byteOffset + dataOffset,
        (npyBuffer.length - dataOffset) / 4
      );

      if (this.totalRecords > 0) {
        const inferredDim = Math.floor(this.vectors.length / this.totalRecords);
        if (inferredDim > 0) {
          this.vectorDim = inferredDim;
        }
      }

      this.ramReady = true;
      console.log(`✅ [VECTOR SEARCH - RAM] Sẵn sàng! Đã nạp ${this.totalRecords} vector đa phương thức (${this.vectorDim} chiều) vào RAM.`);
      return true;
    } catch (error) {
      console.error("❌ [VECTOR SEARCH - RAM] Lỗi khởi tạo Vector Search trên RAM:", error.message);
      this.ramReady = false;
      return false;
    }
  }

  /**
   * Kiểm tra kết nối tới Vector Microservice độc lập (Option 2)
   */
  async checkMicroserviceHealth() {
    try {
      const response = await axios.get(`${this.serviceUrl}/health`, {
        timeout: 3000,
      });
      if (response.status === 200 && response.data?.status === "UP") {
        this.microserviceReady = true;
        console.log(
          `✅ [VECTOR SEARCH - MICROSERVICE] Đã kết nối tới AI Vector Microservice (${this.serviceUrl}) | Model: ${
            response.data.model || "Direct AI Model"
          } | Vectors: ${response.data.total_vectors ?? "N/A"}`
        );
        return true;
      }
    } catch (error) {
      this.microserviceReady = false;
      console.warn(
        `⚠️ [VECTOR SEARCH - MICROSERVICE] Chưa kết nối được tới ${this.serviceUrl} (${error.message}). Sẽ tự động thử lại khi có request hoặc dùng RAM fallback.`
      );
    }
    return false;
  }

  /**
   * Khởi tạo dịch vụ Vector Search theo mode được chọn ("ram" hoặc "microservice")
   */
  init() {
    this.mode = resolveVectorSearchMode();
    console.log(`🔧 [VECTOR SEARCH CONFIG] Mode khởi chạy: "${this.mode.toUpperCase()}"`);

    if (this.mode === "microservice") {
      // Option 2: Sử dụng Microservice chạy model trực tiếp (kèm nạp RAM dự phòng nếu có)
      const fallbackEnabled = process.env.VECTOR_FALLBACK_RAM !== "false";
      if (fallbackEnabled) {
        this.initRamVectors();
      }
      this.ready = true;
      this.checkMicroserviceHealth();
      return;
    }

    // Option 1 (Mặc định): Dùng trực tiếp vector được nạp trên RAM
    const ok = this.initRamVectors();
    this.ready = ok;
  }

  isReady() {
    if (this.mode === "microservice") {
      return true;
    }
    return this.ramReady;
  }

  // ============================================================================
  // OPTION 1: CÁC HÀM TÍNH TOÁN TRỰC TIẾP TRÊN RAM (GIỮ NGUYÊN LOGIC GỐC)
  // ============================================================================

  /**
   * [RAM Mode] Tính toán các sản phẩm tương tự nhất theo Cosine Similarity đa phương thức
   * @param {number} productId - ID sản phẩm (1-based index)
   * @param {number} limit - Số lượng sản phẩm muốn lấy
   * @returns {number[]} Danh sách ID sản phẩm tương tự
   */
  getSimilarProductIdsFromRam(productId, limit = 6) {
    if (!this.ramReady || !productId) return [];

    const targetIdx = Number(productId) - 1; // Map product_id (1..N) sang 0-based row index
    if (targetIdx < 0 || targetIdx >= this.totalRecords) return [];

    const targetOffset = targetIdx * this.vectorDim;
    const scores = [];

    for (let i = 0; i < this.totalRecords; i++) {
      if (i === targetIdx) continue;

      let dot = 0;
      const rowOffset = i * this.vectorDim;
      for (let d = 0; d < this.vectorDim; d++) {
        dot += this.vectors[targetOffset + d] * this.vectors[rowOffset + d];
      }
      scores.push({ id: i + 1, score: dot });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit).map((s) => s.id);
  }

  /**
   * [RAM Mode] Stage 2: Cross-Signal E-Commerce Reranker
   * Tái xếp hạng các ứng viên Top-K bằng cách kết hợp:
   * - Semantic Vector Similarity (50%)
   * - Lexical Exact Match / Token Coverage (35%)
   * - Commercial Popularity & Sales signals (15%)
   * @param {string} query
   * @param {Array<{id: number, score: number}>} candidates
   * @param {number} topK
   * @returns {number[]}
   */
  rerankCandidates(query, candidates, topK = 20) {
    if (!candidates || candidates.length === 0) return [];

    const queryLower = query.toLowerCase().trim();
    const rawWords = queryLower.split(/\s+/).filter((w) => w.length >= 2);

    // Mở rộng từ đồng nghĩa tiếng Anh để chấm điểm khớp chính xác
    const matchWords = new Set(rawWords);
    for (const w of rawWords) {
      if (VI_EN_SYNONYMS[w]) {
        for (const syn of VI_EN_SYNONYMS[w]) matchWords.add(syn);
      }
    }
    const wordsArr = Array.from(matchWords);

    const scored = candidates.map((item) => {
      const titleLower = (this.metadata[item.id - 1]?.title || "").toLowerCase();

      // 1. Điểm khớp từ vựng chính xác (Lexical Exact Match)
      let lexicalScore = 0;
      if (titleLower.includes(queryLower)) {
        lexicalScore += 0.50; // Khớp nguyên cụm từ khóa (Exact phrase bonus)
      }
      let matches = 0;
      for (const w of wordsArr) {
        if (titleLower.includes(w)) matches++;
      }
      lexicalScore += (matches / Math.max(rawWords.length, 1)) * 0.50;

      // 2. Điểm thương mại (Commercial signals)
      const simulatedSold = ((item.id - 1) * 7) % 350;
      const popularityScore = Math.min(1.0, simulatedSold / 350);

      // 3. Công thức Reranking đa mục tiêu
      const finalScore = (item.score * 0.50) + (lexicalScore * 0.35) + (popularityScore * 0.15);

      return {
        id: item.id,
        finalScore,
        semanticScore: item.score,
        lexicalScore,
      };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    return scored.slice(0, topK).map((s) => s.id);
  }

  /**
   * [RAM Mode] Pipeline Tìm kiếm 2 Giai đoạn trên RAM:
   * Giai đoạn 1: Thu hồi ứng viên nhanh bằng Vector Similarity (Candidate Retrieval)
   * Giai đoạn 2: Tái xếp hạng chính xác bằng Multi-Signal Reranker (Reranking)
   * @param {string} keyword
   * @param {number} limit
   * @returns {number[]}
   */
  searchProductsBySemanticFromRam(keyword, limit = 20) {
    if (!this.ramReady || !keyword || typeof keyword !== "string") return [];

    const rawWords = keyword
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    if (rawWords.length === 0) return [];

    // Mở rộng từ đồng nghĩa Việt - Anh
    const expandedWords = new Set(rawWords);
    for (const w of rawWords) {
      if (VI_EN_SYNONYMS[w]) {
        for (const syn of VI_EN_SYNONYMS[w]) {
          expandedWords.add(syn);
        }
      }
    }
    const words = Array.from(expandedWords);

    // 1. Tìm các Anchor Items chứa từ khóa
    const anchors = [];
    for (let i = 0; i < this.totalRecords; i++) {
      const titleLower = (this.metadata[i]?.title || "").toLowerCase();
      let matches = 0;
      for (const w of words) {
        if (titleLower.includes(w)) matches++;
      }
      if (matches > 0) {
        anchors.push({ idx: i, matches });
      }
    }

    if (anchors.length === 0) return [];

    // Chọn top anchor tốt nhất để dựng Vector Centroid cho câu query
    anchors.sort((a, b) => b.matches - a.matches);
    const topAnchors = anchors.slice(0, 8);

    const qVec = new Float32Array(this.vectorDim);
    for (const anchor of topAnchors) {
      const rowOffset = anchor.idx * this.vectorDim;
      for (let d = 0; d < this.vectorDim; d++) {
        qVec[d] += this.vectors[rowOffset + d];
      }
    }

    // Chuẩn hóa L2 norm cho query vector
    let norm = 0;
    for (let d = 0; d < this.vectorDim; d++) {
      norm += qVec[d] * qVec[d];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let d = 0; d < this.vectorDim; d++) {
        qVec[d] /= norm;
      }
    }

    // Giai đoạn 1 (Stage 1): Lấy Top ứng viên dựa trên Vector Cosine Similarity
    const recallK = Math.max(limit * 3, 36);
    const candidateScores = [];

    for (let i = 0; i < this.totalRecords; i++) {
      let dot = 0;
      const rowOffset = i * this.vectorDim;
      for (let d = 0; d < this.vectorDim; d++) {
        dot += qVec[d] * this.vectors[rowOffset + d];
      }
      candidateScores.push({ id: i + 1, score: dot });
    }

    candidateScores.sort((a, b) => b.score - a.score);
    const topCandidates = candidateScores.slice(0, recallK);

    // Giai đoạn 2 (Stage 2): Chạy qua Reranker đa mục tiêu để xếp hạng chính xác nhất
    const finalIds = this.rerankCandidates(keyword, topCandidates, limit);
    return finalIds;
  }

  /**
   * [RAM Mode] Đề xuất sản phẩm cá nhân hóa theo lịch sử xem (User Behavior Recommendation)
   * @param {number[]} viewedProductIds
   * @param {number} limit
   * @returns {number[]}
   */
  getRecommendationsByUserHistoryFromRam(viewedProductIds, limit = 10) {
    if (!this.ramReady || !Array.isArray(viewedProductIds) || viewedProductIds.length === 0) return [];

    const validIndices = viewedProductIds
      .map((id) => Number(id) - 1)
      .filter((idx) => idx >= 0 && idx < this.totalRecords);

    if (validIndices.length === 0) return [];

    // Xây dựng User Profile Vector V_user
    const userVec = new Float32Array(this.vectorDim);
    for (const idx of validIndices) {
      const rowOffset = idx * this.vectorDim;
      for (let d = 0; d < this.vectorDim; d++) {
        userVec[d] += this.vectors[rowOffset + d];
      }
    }

    let norm = 0;
    for (let d = 0; d < this.vectorDim; d++) {
      norm += userVec[d] * userVec[d];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let d = 0; d < this.vectorDim; d++) {
        userVec[d] /= norm;
      }
    }

    const viewedSet = new Set(viewedProductIds.map(Number));
    const scores = [];

    for (let i = 0; i < this.totalRecords; i++) {
      const pid = i + 1;
      if (viewedSet.has(pid)) continue; // Bỏ qua sản phẩm user đã xem

      let dot = 0;
      const rowOffset = i * this.vectorDim;
      for (let d = 0; d < this.vectorDim; d++) {
        dot += userVec[d] * this.vectors[rowOffset + d];
      }
      scores.push({ id: pid, score: dot });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit).map((s) => s.id);
  }

  // ============================================================================
  // UNIFIED INTERFACES (TỰ ĐỘNG CHỌN OPTION 1: RAM HOẶC OPTION 2: MICROSERVICE)
  // ============================================================================

  /**
   * Tìm kiếm sản phẩm theo ngữ nghĩa (Semantic Search)
   * - Nếu mode === "ram": tính toán trực tiếp trên RAM
   * - Nếu mode === "microservice": gửi câu query sang Microservice để encode bằng AI Model trực tiếp
   * @param {string} keyword
   * @param {number} limit
   * @returns {Promise<number[]>}
   */
  async searchProductsBySemantic(keyword, limit = 20) {
    if (!keyword || typeof keyword !== "string") return [];

    if (this.mode === "microservice") {
      try {
        const response = await axios.post(
          `${this.serviceUrl}/api/v1/vector/search`,
          { query: keyword, limit },
          { timeout: this.serviceTimeoutMs }
        );
        if (Array.isArray(response.data?.productIds)) {
          return response.data.productIds;
        }
      } catch (error) {
        console.warn(
          `⚠️ [VECTOR MICROSERVICE] Lỗi gọi search API (${error.message}), chuyển sang RAM fallback.`
        );
        return this.searchProductsBySemanticFromRam(keyword, limit);
      }
    }

    return this.searchProductsBySemanticFromRam(keyword, limit);
  }

  /**
   * Lấy danh sách ID sản phẩm tương tự theo Cosine Similarity
   * @param {number} productId
   * @param {number} limit
   * @returns {Promise<number[]>}
   */
  async getSimilarProductIds(productId, limit = 6) {
    if (!productId) return [];

    if (this.mode === "microservice") {
      try {
        const response = await axios.get(
          `${this.serviceUrl}/api/v1/vector/similar/${productId}`,
          {
            params: { limit },
            timeout: this.serviceTimeoutMs,
          }
        );
        if (Array.isArray(response.data?.productIds)) {
          return response.data.productIds;
        }
      } catch (error) {
        console.warn(
          `⚠️ [VECTOR MICROSERVICE] Lỗi gọi similar API (${error.message}), chuyển sang RAM fallback.`
        );
        return this.getSimilarProductIdsFromRam(productId, limit);
      }
    }

    return this.getSimilarProductIdsFromRam(productId, limit);
  }

  /**
   * Đề xuất sản phẩm theo lịch sử xem của user
   * @param {number[]} viewedProductIds
   * @param {number} limit
   * @returns {Promise<number[]>}
   */
  async getRecommendationsByUserHistory(viewedProductIds, limit = 10) {
    if (!Array.isArray(viewedProductIds) || viewedProductIds.length === 0) return [];

    if (this.mode === "microservice") {
      try {
        const response = await axios.post(
          `${this.serviceUrl}/api/v1/vector/recommend`,
          { viewedProductIds, limit },
          { timeout: this.serviceTimeoutMs }
        );
        if (Array.isArray(response.data?.productIds)) {
          return response.data.productIds;
        }
      } catch (error) {
        console.warn(
          `⚠️ [VECTOR MICROSERVICE] Lỗi gọi recommend API (${error.message}), chuyển sang RAM fallback.`
        );
        return this.getRecommendationsByUserHistoryFromRam(viewedProductIds, limit);
      }
    }

    return this.getRecommendationsByUserHistoryFromRam(viewedProductIds, limit);
  }

  // ============================================================================
  // ĐỒNG BỘ & CẬP NHẬT VECTOR TỪ DATABASE SANG MICROSERVICE KHI SẢN PHẨM THAY ĐỔI
  // ============================================================================

  /**
   * Yêu cầu Microservice tính toán lại vector bằng Model cho 1 sản phẩm từ Database chung
   * (Được gọi khi tạo mới, cập nhật hoặc duyệt sản phẩm)
   * @param {number} productId
   */
  async upsertProductVector(productId) {
    if (!productId || this.mode !== "microservice") return null;

    try {
      const response = await axios.post(
        `${this.serviceUrl}/api/v1/vector/upsert/${productId}`,
        {},
        { timeout: 30000 }
      );
      console.log(`🔄 [VECTOR MICROSERVICE] Đã cập nhật vector cho product_id=${productId}`);
      return response.data;
    } catch (error) {
      console.warn(
        `⚠️ [VECTOR MICROSERVICE] Không thể cập nhật vector cho product_id=${productId}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Xóa/vô hiệu hóa vector của sản phẩm khi bị xóa hoặc ẩn
   * @param {number} productId
   */
  async deleteProductVector(productId) {
    if (!productId || this.mode !== "microservice") return null;

    try {
      const response = await axios.delete(
        `${this.serviceUrl}/api/v1/vector/${productId}`,
        { timeout: 10000 }
      );
      console.log(`🗑️ [VECTOR MICROSERVICE] Đã xóa vector của product_id=${productId}`);
      return response.data;
    } catch (error) {
      console.warn(
        `⚠️ [VECTOR MICROSERVICE] Không thể xóa vector cho product_id=${productId}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Đồng bộ toàn bộ sản phẩm mới/cập nhật từ MySQL Database sang Vector Index
   */
  async syncDatabaseVectors() {
    if (this.mode !== "microservice") return null;

    try {
      const response = await axios.post(
        `${this.serviceUrl}/api/v1/vector/sync-db`,
        {},
        { timeout: 120000 }
      );
      return response.data;
    } catch (error) {
      console.warn(`⚠️ [VECTOR MICROSERVICE] Lỗi đồng bộ DB vectors: ${error.message}`);
      return null;
    }
  }
}

const vectorSearchService = new VectorSearchService();
export default vectorSearchService;
