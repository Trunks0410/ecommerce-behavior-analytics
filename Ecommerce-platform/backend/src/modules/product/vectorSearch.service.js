import fs from "fs";
import path from "path";
import zlib from "zlib";
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

class VectorSearchService {
  constructor() {
    this.ready = false;
    this.vectors = null; // Float32Array ma trận 5000 x 2048
    this.metadata = null; // Danh sách metadata (title, item_id, sync_index)
    this.totalRecords = 0;
    this.vectorDim = 2048;
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

  init() {
    if (this.ready) return;

    try {
      // 1. Tìm file vector: ưu tiên embeddings.npy, nếu không có thì đọc trực tiếp product_embeddings.npz
      const npyPath = this.findFile("embeddings.npy");
      const npzPath = this.findFile("product_embeddings.npz");
      const metaPath = this.findFile("product_metadata.json");

      if ((!npyPath && !npzPath) || !metaPath) {
        console.warn("⚠️ [VECTOR SEARCH] Không tìm thấy product_embeddings.npz hoặc product_metadata.json. Tính năng Vector Search tạm thời tắt.");
        return;
      }

      // 2. Nạp metadata để liên kết từ khóa (Text) với Vector Index (0..4999)
      const metaRaw = fs.readFileSync(metaPath, "utf-8");
      this.metadata = JSON.parse(metaRaw);
      this.totalRecords = this.metadata.length;

      // 3. Đọc dữ liệu vector nhị phân
      let npyBuffer = null;
      if (npyPath) {
        console.log(`🧠 [VECTOR SEARCH] Đang nạp ma trận vector từ: ${npyPath}...`);
        npyBuffer = fs.readFileSync(npyPath);
      } else {
        console.log(`🧠 [VECTOR SEARCH] Đang giải nén trực tiếp ma trận vector từ file nén: ${npzPath}...`);
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

      this.ready = true;
      console.log(`✅ [VECTOR SEARCH & RERANKER] Sẵn sàng! Đã nạp ${this.totalRecords} vector đa phương thức (${this.vectorDim} chiều).`);
    } catch (error) {
      console.error("❌ [VECTOR SEARCH] Lỗi khởi tạo Vector Search:", error.message);
      this.ready = false;
    }
  }

  isReady() {
    return this.ready;
  }

  /**
   * Tính toán các sản phẩm tương tự nhất theo Cosine Similarity đa phương thức (Ảnh + Văn bản)
   * @param {number} productId - ID sản phẩm (1-based index)
   * @param {number} limit - Số lượng sản phẩm muốn lấy
   * @returns {number[]} Danh sách ID sản phẩm tương tự
   */
  getSimilarProductIds(productId, limit = 6) {
    if (!this.ready || !productId) return [];

    const targetIdx = productId - 1; // Map product_id (1..N) sang 0-based row index
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
   * Stage 2: Cross-Signal E-Commerce Reranker
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
      const popularityScore = Math.min(1.0, simulatedSold / 300);

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
   * Pipeline Tìm kiếm 2 Giai đoạn:
   * Giai đoạn 1: Thu hồi ứng viên nhanh bằng Vector Similarity (Candidate Retrieval)
   * Giai đoạn 2: Tái xếp hạng chính xác bằng Multi-Signal Reranker (Reranking)
   * @param {string} keyword
   * @param {number} limit
   * @returns {number[]}
   */
  searchProductsBySemantic(keyword, limit = 20) {
    if (!this.ready || !keyword || typeof keyword !== "string") return [];

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
      const titleLower = this.metadata[i].title.toLowerCase();
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

    // Giai đoạn 1 (Stage 1): Lấy Top 40 ứng viên dựa trên Vector Cosine Similarity
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
   * Đề xuất sản phẩm cá nhân hóa theo lịch sử xem (User Behavior Recommendation)
   * @param {number[]} viewedProductIds
   * @param {number} limit
   * @returns {number[]}
   */
  getRecommendationsByUserHistory(viewedProductIds, limit = 10) {
    if (!this.ready || !Array.isArray(viewedProductIds) || viewedProductIds.length === 0) return [];

    const validIndices = viewedProductIds
      .map((id) => id - 1)
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

    const viewedSet = new Set(viewedProductIds);
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
}

const vectorSearchService = new VectorSearchService();
export default vectorSearchService;
