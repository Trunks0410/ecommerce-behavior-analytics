import reviewService from "./review.service.js";

const createReview = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { order_id, variant_id, rating, comment, images } = req.body;
    const userId = req.user.id; 

    const newReview = await reviewService.createReview(userId, productId, {
      order_id, variant_id, rating, comment, images
    });

    return res.status(201).json({
      message: "Đánh giá thành công! Bạn được tặng 100 điểm tích lũy.",
      data: newReview,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return res.status(error.message.includes("không hợp lệ") || error.message.includes("đã đánh giá") ? 400 : 500).json({ message: error.message || "Lỗi máy chủ nội bộ." });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const data = await reviewService.getProductReviews(productId, page, limit);

    return res.status(200).json({
      message: "Success",
      data,
    });
  } catch (error) {
    console.error("Error getting reviews:", error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

const updateReview = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { order_id, rating, comment, images } = req.body;
    const userId = req.user.id; 

    const updatedReview = await reviewService.updateReview(userId, productId, {
      order_id, rating, comment, images
    });

    return res.status(200).json({
      message: "Cập nhật đánh giá thành công!",
      data: updatedReview,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return res.status(error.message.includes("Không tìm thấy") ? 404 : 500).json({ message: error.message || "Lỗi máy chủ nội bộ." });
  }
};

export default {
  createReview,
  getProductReviews,
  updateReview,
};
