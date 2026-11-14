import db from "../../database/models/index.js";

const { ProductReview, Product, User, ShopOrder, ParentOrder } = db;

const createReview = async (userId, productId, { order_id, rating, comment }) => {
  const transaction = await db.sequelize.transaction();
  try {
    // 1. Kiểm tra đơn hàng đã mua và ở trạng thái DELIVERED
    const order = await ShopOrder.findOne({
      where: { id: order_id, status: ["DELIVERED", "COMPLETED"] },
      include: [{
        model: ParentOrder,
        as: "parentOrder",
        where: { user_id: userId }
      }]
    });
    if (!order) {
      throw new Error("Đơn hàng không hợp lệ hoặc chưa được giao thành công.");
    }

    // 2. Kiểm tra xem người dùng đã đánh giá sản phẩm này trong đơn hàng này chưa (kể cả đã xóa mềm)
    const existingReview = await ProductReview.findOne({
      where: { user_id: userId, product_id: productId, shop_order_id: order_id },
      paranoid: false,
    });
    if (existingReview) {
      throw new Error("Bạn đã đánh giá sản phẩm này trong đơn hàng này.");
    }

    // 3. Lưu Review
    const newReview = await ProductReview.create(
      {
        user_id: userId,
        product_id: productId,
        shop_order_id: order_id,
        rating,
        comment,
      },
      { transaction }
    );

    // 4. Cộng 100 điểm tích lũy
    await User.increment('loyalty_points', { by: 100, where: { id: userId }, transaction });

    await transaction.commit();
    return newReview;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getProductReviews = async (productId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const reviews = await ProductReview.findAndCountAll({
    where: { product_id: productId },
    include: [
      { model: User, as: "user", attributes: ["id", "email"], include: ["profile"] },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    total: reviews.count,
    page,
    totalPages: Math.ceil(reviews.count / limit),
    reviews: reviews.rows,
  };
};

const updateReview = async (userId, productId, { order_id, rating, comment }) => {
  const review = await ProductReview.findOne({
    where: { user_id: userId, product_id: productId, shop_order_id: order_id }
  });
  if (!review) throw new Error("Không tìm thấy đánh giá");
  
  await review.update({ rating, comment });
  return review;
};

export default {
  createReview,
  getProductReviews,
  updateReview,
};
