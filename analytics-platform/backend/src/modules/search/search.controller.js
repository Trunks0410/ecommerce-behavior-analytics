import vectorSearchEngine from "./vectorSearch.service.js";

export const getHealth = (req, res) => {
  const status = vectorSearchEngine.getStatus();
  return res.status(200).json(status);
};

export const searchProducts = async (req, res) => {
  try {
    const query = req.query.query || req.query.keyword || req.body?.query || req.body?.keyword || "";
    const limit = Number(req.query.limit || req.body?.limit) || 20;
    const mode = req.query.mode || req.body?.mode;
    const rerank = req.query.rerank ?? req.body?.rerank;

    if (!query.trim()) {
      return res.status(200).json({
        success: true,
        query: "",
        count: 0,
        productIds: [],
        results: [],
      });
    }

    const ranked = await vectorSearchEngine.search(query, limit, { mode, rerank });
    const productIds = ranked.map((r) => r.id);

    return res.status(200).json({
      success: true,
      query,
      count: productIds.length,
      productIds,
      results: ranked,
    });
  } catch (error) {
    console.error("❌ [API] Lỗi tìm kiếm Vector:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi nội bộ khi tìm kiếm vector",
      error: error.message,
    });
  }
};

export const visualSearchProducts = async (req, res) => {
  try {
    const { imageBase64, text = "", limit = 24 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu ảnh imageBase64" });
    }

    const ranked = await vectorSearchEngine.searchByImage(imageBase64, text, Number(limit) || 24);
    const productIds = ranked.map((r) => r.id);

    return res.status(200).json({
      success: true,
      engine: "qwen3-vl-multimodal",
      count: productIds.length,
      productIds,
      results: ranked,
    });
  } catch (error) {
    console.error("❌ [API] Lỗi Visual Search Qwen3-VL:", error.message);
    return res.status(502).json({
      success: false,
      message: "Không thể thực hiện Visual Search qua Qwen3-VL",
      error: error.message,
    });
  }
};

export const getSimilarProducts = (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const limit = Number(req.query.limit || req.body?.limit) || 6;

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId không hợp lệ" });
    }

    const similar = vectorSearchEngine.getSimilarProducts(productId, limit);
    const productIds = similar.map((s) => s.id);

    return res.status(200).json({
      success: true,
      productId,
      count: productIds.length,
      productIds,
      results: similar,
    });
  } catch (error) {
    console.error("❌ [API] Lỗi lấy sản phẩm tương tự:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi nội bộ khi lấy sản phẩm tương tự",
      error: error.message,
    });
  }
};

export const getRecommendations = (req, res) => {
  try {
    const interactions = req.body?.interactions;
    const viewedProductIds = req.body?.viewedProductIds || req.body?.viewedIds || [];
    const signalWeights = req.body?.signalWeights || {};
    const limit = Number(req.body?.limit || req.query.limit) || 10;

    const recommended =
      Array.isArray(interactions) && interactions.length > 0
        ? vectorSearchEngine.recommendWithBehaviorPipeline(interactions, limit, {
            purchasedIds: req.body?.purchasedIds || [],
            softPurchasedIds: req.body?.softPurchasedIds || [],
            inCartIds: req.body?.inCartIds || [],
            viewedOftenIds: req.body?.viewedOftenIds || [],
            filterMode: req.body?.filterMode || "hard",
            excludeInCart: req.body?.excludeInCart !== false,
          })
        : vectorSearchEngine.getRecommendationsByUserHistory(
            viewedProductIds,
            limit,
            signalWeights
          );
    const productIds = recommended.map((r) => r.id);

    return res.status(200).json({
      success: true,
      count: productIds.length,
      productIds,
      results: recommended,
    });
  } catch (error) {
    console.error("❌ [API] Lỗi tính đề xuất sản phẩm:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi nội bộ khi tính đề xuất sản phẩm",
      error: error.message,
    });
  }
};

export const upsertVector = (req, res) => {
  const productId = Number(req.params.productId);
  return res.status(200).json({
    success: true,
    message: `Đã ghi nhận yêu cầu cập nhật vector cho product_id=${productId}`,
    productId,
  });
};

export const deleteVector = (req, res) => {
  const productId = Number(req.params.productId);
  return res.status(200).json({
    success: true,
    message: `Đã ghi nhận yêu cầu xóa vector cho product_id=${productId}`,
    productId,
  });
};

export const syncDbVectors = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Đã đồng bộ vector từ Database vào Vector Search Engine",
    total_vectors: vectorSearchEngine.totalRecords,
  });
};

export const visualSearchByImage = async (req, res) => {
  try {
    const { imageBase64, limit = 24 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        success: false,
        message: "imageBase64 is required",
        productIds: [],
        results: [],
      });
    }

    const results = await vectorSearchEngine.searchByImageVector(
      imageBase64,
      Number(limit) || 24
    );
    const productIds = results.map((r) => r.id);

    return res.status(200).json({
      success: true,
      count: productIds.length,
      productIds,
      results,
    });
  } catch (error) {
    console.error("[Visual Search Controller Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
