import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLOR_TERMS = new Set([
  "white", "black", "brown", "tan", "navy", "blue", "red", "pink",
  "green", "grey", "gray", "yellow", "orange", "purple", "silver",
  "gold", "beige", "khaki", "cream", "maroon",
]);

const SYNONYM_GROUPS = [
  ["shoes", "shoe", "sneakers", "sneaker", "boots", "boot", "sandals", "sandal", "loafers", "slippers", "footwear", "trainers", "running"],
  ["phone", "smartphone", "mobile", "iphone", "samsung", "oppo", "xiaomi"],
  ["case", "cover", "bumper", "shell"],
  ["bag", "backpack", "handbag", "tote", "purse", "wallet", "luggage", "suitcase"],
  ["shirt", "t-shirt", "tee", "polo", "blouse", "top", "hoodie", "sweater"],
  ["pants", "jeans", "trousers", "shorts"],
  ["watch", "smartwatch", "timepiece"],
  ["headphones", "earphones", "earbuds", "headset"],
  ["ring", "rings", "band", "engagement"],
  ["necklace", "pendant", "choker", "chain"],
  ["earring", "earrings", "studs", "hoops"],
  ["bracelet", "bangle", "wristband"],
  ["cabinet", "wardrobe", "dresser", "cupboard", "closet", "locker", "sideboard", "chest", "storage"],
  ["table", "desk", "nightstand", "console"],
  ["chair", "sofa", "couch", "armchair", "stool", "bench", "recliner"],
  ["shelf", "shelves", "bookshelf", "rack", "bookcase"],
  ["lamp", "light", "lantern", "chandelier"],
  ["rug", "carpet", "mat"],
  ["pillow", "cushion"],
  ["glasses", "sunglasses", "eyewear"],
];

const VI_EN_FALLBACK_PHRASES = [
  ["ốp lưng điện thoại", "phone case"],
  ["ốp lưng", "phone case"],
  ["ốp điện thoại", "phone case"],
  ["màu trắng", "white"],
  ["màu đen", "black"],
  ["màu hồng", "pink"],
  ["màu xanh dương", "blue"],
  ["màu xanh lá", "green"],
  ["màu xanh", "blue"],
  ["màu đỏ", "red"],
  ["màu vàng", "yellow"],
  ["màu nâu", "brown"],
  ["màu xám", "grey"],
  ["màu tím", "purple"],
  ["màu cam", "orange"],
  ["màu bạc", "silver"],
  ["màu be", "beige"],
  ["giày thể thao", "sneakers"],
  ["giày chạy bộ", "running shoes"],
  ["giày da", "leather shoes"],
  ["giày", "shoes"],
  ["dép", "sandals"],
  ["túi xách", "handbag"],
  ["ba lô", "backpack"],
  ["balo", "backpack"],
  ["ví", "wallet"],
  ["áo thun", "t-shirt"],
  ["áo sơ mi", "shirt"],
  ["áo khoác", "jacket"],
  ["quần jean", "jeans"],
  ["quần", "pants"],
  ["đồng hồ", "watch"],
  ["tai nghe", "headphones"],
  ["điện thoại", "phone"],
  ["dây chuyền", "necklace"],
  ["bông tai", "earrings"],
  ["vòng tay", "bracelet"],
  ["nhẫn", "ring"],
  ["tủ quần áo", "wardrobe"],
  ["tủ", "cabinet"],
  ["kệ sách", "bookshelf"],
  ["kệ", "shelf"],
  ["bàn phím", "keyboard"],
  ["bàn", "table"],
  ["ghế sofa", "sofa"],
  ["ghế", "chair"],
  ["giường", "bed"],
  ["đèn", "lamp"],
  ["thảm", "rug"],
  ["gối", "pillow"],
  ["kính mát", "sunglasses"],
  ["kính", "glasses"],
  ["trắng", "white"],
  ["đen", "black"],
  ["hồng", "pink"],
  ["đỏ", "red"],
  ["nâu", "brown"],
  ["xám", "grey"],
  ["vàng", "yellow"],
  ["tím", "purple"],
  ["cam", "orange"],
  ["bạc", "silver"],
  ["nam", "men"],
  ["nữ", "women"],
  ["da", "leather"],
];

function hasWordMatch(textLower, term) {
  if (!textLower || !term) return false;
  if (term.includes(" ")) {
    return textLower.includes(term);
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^a-z0-9\\u00C0-\\u1EF9])${escaped}([^a-z0-9\\u00C0-\\u1EF9]|$)`, "i");
  return regex.test(textLower);
}

function expandWordWithSynonyms(word) {
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(word)) {
      return group;
    }
  }
  return [word];
}

function fallbackTranslateViToEn(text) {
  let result = String(text || "").toLowerCase().trim();
  for (const [vi, en] of VI_EN_FALLBACK_PHRASES) {
    if (result.includes(vi)) {
      result = result.replaceAll(vi, ` ${en} `);
    }
  }
  return result.replace(/\s+/g, " ").trim();
}

class VectorSearchEngine {
  constructor() {
    this.ready = false;
    this.vectors = null; // Float32Array ma trận N x 2048
    this.metadata = null; // Danh sách metadata (title, item_id, sync_index)
    this.totalRecords = 0;
    this.vectorDim = 2048;
    this.modelName = "Qwen3-VL-Embedding-2B (Multimodal)";
    this.translationCache = new Map();
    this.queryVectorCache = new Map();
  }

  findFile(filename) {
    const candidatePaths = [
      path.resolve(__dirname, `../../../vector-data/${filename}`),
      path.resolve(process.cwd(), `vector-data/${filename}`),
      path.resolve(process.cwd(), `backend/vector-data/${filename}`),
      path.resolve(process.cwd(), `../vector-data/${filename}`),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  init() {
    if (this.ready) return true;

    try {
      const npzPath = this.findFile("product_embeddings.npz");
      const metaPath = this.findFile("product_metadata.json");

      if (!npzPath || !metaPath) {
        console.warn("⚠️ [SEARCH ENGINE] Không tìm thấy product_embeddings.npz hoặc product_metadata.json tại analytics-platform/backend/vector-data/");
        return false;
      }

      console.log(`🧠 [SEARCH ENGINE] Đang nạp metadata từ: ${metaPath}...`);
      const metaRaw = fs.readFileSync(metaPath, "utf-8");
      this.metadata = JSON.parse(metaRaw);
      this.totalRecords = this.metadata.length;

      console.log(`🧠 [SEARCH ENGINE] Đang giải nén trực tiếp ma trận vector từ file nén: ${npzPath}...`);
      const zipBuf = fs.readFileSync(npzPath);
      const nameLen = zipBuf.readUInt16LE(26);
      const extraLen = zipBuf.readUInt16LE(28);
      const dataStart = 30 + nameLen + extraLen;
      const npyBuffer = zlib.inflateRawSync(zipBuf.slice(dataStart));

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

      this.ready = true;
      console.log(`✅ [SEARCH ENGINE] Khởi tạo thành công! Đã nạp ${this.totalRecords} vector (${this.vectorDim} chiều) vào RAM.`);
      return true;
    } catch (error) {
      console.error("❌ [SEARCH ENGINE] Lỗi khởi tạo Vector Search:", error.message);
      this.ready = false;
      return false;
    }
  }

  getStatus() {
    return {
      status: this.ready ? "UP" : "DOWN",
      service: "analytics-search-platform",
      model: this.modelName,
      ready: this.ready,
      total_vectors: this.totalRecords,
      vector_dim: this.vectorDim,
    };
  }

  /**
   * Dịch truy vấn sang tiếng Anh thông qua API dịch thuật (Google Translate Endpoint)
   * Có cache trong RAM để các truy vấn lặp lại đạt độ trễ 0ms.
   */
  async translateToEnglish(text) {
    const clean = String(text || "").trim();
    if (!clean) return "";

    // Nếu là chuỗi ASCII thuần (tiếng Anh sẵn), giữ nguyên không cần gọi API
    if (/^[\x00-\x7F]+$/.test(clean)) {
      return clean;
    }

    const cacheKey = clean.toLowerCase();
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    // Ưu tiên tra từ điển Việt-Anh nội bộ tức thì (0ms) trước khi gọi Google Translate
    const localFastTranslation = fallbackTranslateViToEn(clean);
    if (localFastTranslation && localFastTranslation !== cacheKey) {
      this.translationCache.set(cacheKey, localFastTranslation);
      return localFastTranslation;
    }

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(clean)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json,text/plain,*/*",
        },
        signal: AbortSignal.timeout(1200),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || contentType.includes("text/html")) {
        throw new Error(`HTTP ${res.status} (${contentType || "unknown"})`);
      }
      const data = await res.json();
      if (data && Array.isArray(data[0])) {
        const translated = data[0].map((item) => item[0]).join("").trim();
        if (translated) {
          this.translationCache.set(cacheKey, translated);
          return translated;
        }
      }
    } catch (err) {
      console.warn(`⚠️ [SEARCH TRANSLATE] Không thể dịch "${clean}": ${err.message}`);
    }

    const fallback = fallbackTranslateViToEn(clean);
    if (fallback && fallback !== cacheKey) {
      this.translationCache.set(cacheKey, fallback);
      return fallback;
    }
    return clean;
  }

  /**
   * Tính toán các sản phẩm tương tự nhất theo Cosine Similarity đa phương thức
   */
  getSimilarProducts(productId, limit = 6) {
    if (!this.ready || !productId) return [];

    const targetIdx = Number(productId) - 1;
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
    return scores.slice(0, limit);
  }

  /**
   * Stage 2: Cross-Signal E-Commerce Reranker
   * Kết hợp Semantic Vector Similarity (50%) + Lexical Exact Match (35%) + Commercial Popularity (15%)
   * Kèm cơ chế phạt sai loại thiết bị (Device Mismatch Penalty).
   */
  rerankCandidates(englishQuery, candidates, topK = 20) {
    if (!candidates || candidates.length === 0) return [];

    const queryLower = englishQuery.toLowerCase().trim();
    const stopWords = new Set(["for", "the", "and", "with", "in", "on", "of", "to", "a", "an", "color", "colored"]);
    const rawWords = queryLower
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w));

    const queryColors = rawWords.filter((w) => COLOR_TERMS.has(w));
    const isPhoneQuery = rawWords.some((w) => ["phone", "mobile", "smartphone", "iphone", "samsung", "oppo"].includes(w));
    const mismatchedDevices = ["ipad", "tablet", "laptop", "macbook", "notebook", "sleeve", "kindle"];

    const scored = candidates.map((item) => {
      const titleLower = (this.metadata[item.id - 1]?.title || "").toLowerCase();
      const titleTokens = new Set(titleLower.split(/[^a-z0-9]+/).filter(Boolean));

      // 1. Điểm khớp từ vựng & đồng nghĩa ngành hàng (Lexical & Synonym Match với Word Boundary)
      let lexicalScore = 0;
      if (hasWordMatch(titleLower, queryLower)) {
        lexicalScore += 0.40;
      }
      let matches = 0;
      for (const w of rawWords) {
        const synonyms = expandWordWithSynonyms(w);
        if (synonyms.some((syn) => hasWordMatch(titleLower, syn))) {
          matches++;
        }
      }
      lexicalScore += (matches / Math.max(rawWords.length, 1)) * 0.60;

      // 2. Ưu tiên khớp màu sắc & phạt sai màu (Color Attribute Alignment)
      let colorBonus = 0;
      let colorPenalty = 0;
      if (queryColors.length > 0) {
        const hasRequestedColor = queryColors.some((c) => titleTokens.has(c) || titleLower.includes(c));
        if (hasRequestedColor) {
          colorBonus = 0.25;
        } else {
          // Kiểm tra xem tiêu đề có nêu rõ một màu khác xung đột không
          let hasConflictingColor = false;
          for (const colorTerm of COLOR_TERMS) {
            if (!queryColors.includes(colorTerm) && titleTokens.has(colorTerm)) {
              hasConflictingColor = true;
              break;
            }
          }
          colorPenalty = hasConflictingColor ? 0.30 : 0.12;
        }
      }

      // 3. Điểm thương mại (Commercial signals - chỉ làm tie-breaker nhẹ)
      const simulatedSold = ((item.id - 1) * 7) % 350;
      const popularityScore = Math.min(1.0, simulatedSold / 350);

      // 4. Phạt sai loại thiết bị nếu query nhắm vào điện thoại nhưng sản phẩm là iPad/Laptop
      let devicePenalty = 0;
      if (isPhoneQuery && mismatchedDevices.some((dev) => titleLower.includes(dev))) {
        devicePenalty = 0.25;
      }

      // 5. Công thức Reranking đa mục tiêu
      const finalScore =
        (item.score * 0.45) +
        (lexicalScore * 0.50) +
        (popularityScore * 0.05) +
        colorBonus -
        colorPenalty -
        devicePenalty;

      return {
        id: item.id,
        finalScore,
        semanticScore: item.score,
        lexicalScore,
        title: this.metadata[item.id - 1]?.title,
      };
    });

    // Chỉ giữ sản phẩm có độ liên quan thực sự (khớp từ vựng/đồng nghĩa hoặc semantic >= 0.34)
    const relevant = scored.filter(
      (item) => item.lexicalScore > 0 || item.semanticScore >= 0.34
    );
    const pool = relevant.length > 0 ? relevant : scored.filter((item) => item.semanticScore >= 0.28);
    pool.sort((a, b) => b.finalScore - a.finalScore);
    return pool.slice(0, topK);
  }

  /**
   * Lấy vector embedding trực tiếp từ Qwen3-VL /embed (hỗ trợ đa ngôn ngữ Việt/Anh/Đức)
   */
  async getQueryEmbeddingFromModel(rawQuery) {
    const cacheKey = rawQuery.toLowerCase();
    if (this.queryVectorCache.has(cacheKey)) {
      return this.queryVectorCache.get(cacheKey);
    }

    const modelInferenceUrl = (process.env.MODEL_INFERENCE_URL || "").replace(/\/+$/, "");
    if (!modelInferenceUrl) return null;

    try {
      const res = await fetch(`${modelInferenceUrl}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawQuery }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;

      const data = await res.json();
      const rawVec = data?.vector;
      if (!Array.isArray(rawVec) || rawVec.length !== this.vectorDim) return null;

      const qVec = new Float32Array(this.vectorDim);
      let norm = 0;
      for (let d = 0; d < this.vectorDim; d++) {
        const val = Number(rawVec[d]) || 0;
        qVec[d] = val;
        norm += val * val;
      }
      norm = Math.sqrt(norm);
      if (norm > 0) {
        for (let d = 0; d < this.vectorDim; d++) qVec[d] /= norm;
      }

      if (this.queryVectorCache.size >= 500) {
        const oldestKey = this.queryVectorCache.keys().next().value;
        this.queryVectorCache.delete(oldestKey);
      }
      this.queryVectorCache.set(cacheKey, qVec);
      return qVec;
    } catch (err) {
      console.warn(`⚠️ [SEARCH EMBED] Qwen3-VL /embed fallback to anchors (${err.message})`);
      return null;
    }
  }

  /**
   * Pipeline Tìm kiếm 2 Giai đoạn:
   * Giai đoạn 0: Chuẩn hóa / Dịch từ khóa sang tiếng Anh để chấm điểm Lexical Rerank
   * Giai đoạn 1: Tạo Query Vector bằng Qwen3-VL /embed (ưu tiên) hoặc Anchor Centroid (fallback)
   * Giai đoạn 2: Tái xếp hạng chính xác bằng Multi-Signal Reranker (Reranking)
   */
  async search(keyword, limit = 20) {
    if (!this.ready || !keyword || typeof keyword !== "string") return [];

    const cleanQuery = keyword.trim();
    if (!cleanQuery) return [];

    const englishQuery = await this.translateToEnglish(cleanQuery);
    const stopWords = new Set(["for", "the", "and", "with", "in", "on", "of", "to", "a", "an", "color", "colored"]);

    const words = Array.from(
      new Set(
        englishQuery
          .toLowerCase()
          .split(/[^a-z0-9\u00C0-\u1EF9]+/)
          .filter((w) => w.length >= 2 && !stopWords.has(w))
      )
    );

    // Ưu tiên gọi Qwen3-VL /embed (hiểu đa ngôn ngữ Việt/Anh trực tiếp)
    // Dùng englishQuery nếu dịch được sang tiếng Anh chuẩn hoặc cleanQuery nếu không
    const embedInput =
      englishQuery && englishQuery.toLowerCase() !== cleanQuery.toLowerCase()
        ? `${englishQuery} (${cleanQuery})`
        : cleanQuery;
    let qVec = await this.getQueryEmbeddingFromModel(embedInput);

    // Fallback Stage 1B: Dựng Query Vector Centroid từ Anchor Items có ranh giới từ
    if (!qVec) {
      if (words.length === 0) return [];

      const anchors = [];
      for (let i = 0; i < this.totalRecords; i++) {
        const titleLower = (this.metadata[i]?.title || "").toLowerCase();
        let matches = 0;
        for (const w of words) {
          const synonyms = expandWordWithSynonyms(w);
          if (synonyms.some((syn) => hasWordMatch(titleLower, syn))) {
            matches++;
          }
        }
        if (matches > 0) {
          anchors.push({ idx: i, matches });
        }
      }

      if (anchors.length === 0) return [];

      anchors.sort((a, b) => b.matches - a.matches);
      const topAnchors = anchors.slice(0, 8);

      qVec = new Float32Array(this.vectorDim);
      for (const anchor of topAnchors) {
        const rowOffset = anchor.idx * this.vectorDim;
        for (let d = 0; d < this.vectorDim; d++) {
          qVec[d] += this.vectors[rowOffset + d];
        }
      }

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
    const rankedResults = this.rerankCandidates(englishQuery, topCandidates, limit);
    return rankedResults;
  }

  /**
   * Tìm kiếm trực tiếp bằng Hình ảnh thông qua Qwen3-VL Multimodal Inference (/embed-image)
   */
  async searchByImage(imageBase64, text = "", limit = 24) {
    if (!this.ready || !imageBase64) return [];

    const modelInferenceUrl = (process.env.MODEL_INFERENCE_URL || "").replace(/\/+$/, "");
    if (!modelInferenceUrl) {
      throw new Error("MODEL_INFERENCE_URL is not configured");
    }

    const res = await fetch(`${modelInferenceUrl}/embed-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        ...(text && text.trim() ? { text: text.trim() } : {}),
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Qwen embed-image HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const rawVec = data?.vector;
    if (!Array.isArray(rawVec) || rawVec.length !== this.vectorDim) {
      throw new Error(
        `Invalid embedding dimension from Qwen (got ${rawVec?.length}, expected ${this.vectorDim})`
      );
    }

    const qVec = new Float32Array(this.vectorDim);
    let norm = 0;
    for (let d = 0; d < this.vectorDim; d++) {
      const val = Number(rawVec[d]) || 0;
      qVec[d] = val;
      norm += val * val;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let d = 0; d < this.vectorDim; d++) {
        qVec[d] /= norm;
      }
    }

    const scores = [];
    for (let i = 0; i < this.totalRecords; i++) {
      let dot = 0;
      const rowOffset = i * this.vectorDim;
      for (let d = 0; d < this.vectorDim; d++) {
        dot += qVec[d] * this.vectors[rowOffset + d];
      }
      scores.push({
        id: i + 1,
        score: dot,
        semanticScore: dot,
        title: this.metadata[i]?.title,
      });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, Math.max(1, Number(limit) || 24));
  }

  /**
   * Đề xuất sản phẩm cá nhân hóa đa sở thích (Multi-Interest Round-Robin Interleaving)
   * Tổng hợp xen kẽ các danh mục/sản phẩm khách hàng đã xem, yêu thích, thêm giỏ hàng
   * thay vì gộp về một điểm duy nhất.
   */
  getRecommendationsByUserHistory(viewedProductIds, limit = 10, signalWeights = {}) {
    if (!this.ready || !Array.isArray(viewedProductIds) || viewedProductIds.length === 0) return [];

    const validAnchors = [];
    const seenIdx = new Set();
    for (const id of viewedProductIds) {
      const idx = Number(id) - 1;
      if (idx >= 0 && idx < this.totalRecords && !seenIdx.has(idx)) {
        seenIdx.add(idx);
        const pid = idx + 1;
        const pos = validAnchors.length;
        const weight = Math.pow(0.85, pos) * (Number(signalWeights?.[pid]) || 1.0);
        validAnchors.push({ idx, pid, weight });
      }
      if (validAnchors.length >= 8) break;
    }

    if (validAnchors.length === 0) return [];

    const viewedSet = new Set(viewedProductIds.map(Number));
    const perAnchorPoolSize = Math.max(15, Math.ceil((limit * 2) / validAnchors.length) + 6);

    // 1. Tính danh sách sản phẩm liên quan nhất cho từng anchor riêng biệt
    const anchorLists = validAnchors.map((anchor) => {
      const anchorOffset = anchor.idx * this.vectorDim;
      const list = [];
      for (let i = 0; i < this.totalRecords; i++) {
        const pid = i + 1;
        if (viewedSet.has(pid)) continue;

        let dot = 0;
        const rowOffset = i * this.vectorDim;
        for (let d = 0; d < this.vectorDim; d++) {
          dot += this.vectors[anchorOffset + d] * this.vectors[rowOffset + d];
        }
        list.push({ id: pid, score: dot, weightedScore: dot * anchor.weight });
      }
      list.sort((a, b) => b.score - a.score);
      return list.slice(0, perAnchorPoolSize);
    });

    // 2. Trộn xen kẽ (Round-Robin Interleaving) giữa các nhóm sở thích để đảm bảo đa dạng
    const interleaved = [];
    const pickedIds = new Set();
    let round = 0;

    while (interleaved.length < limit) {
      let addedInRound = false;
      for (let a = 0; a < anchorLists.length; a++) {
        const list = anchorLists[a];
        while (list.length > 0 && pickedIds.has(list[0].id)) {
          list.shift();
        }
        if (list.length > 0) {
          const item = list.shift();
          pickedIds.add(item.id);
          interleaved.push({ id: item.id, score: item.weightedScore });
          addedInRound = true;
          if (interleaved.length >= limit) break;
        }
      }
      if (!addedInRound) break;
      round++;
      if (round > perAnchorPoolSize + 2) break;
    }

    return interleaved.slice(0, limit);
  }
}

const vectorSearchEngine = new VectorSearchEngine();
export default vectorSearchEngine;
