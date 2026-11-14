import db from "../../database/models/index.js";

// Lấy giỏ hàng đầy đủ (kèm sản phẩm, variant, ảnh)
const getCartByUserId = async (userId) => {
  const items = await db.CartItem.findAll({
    where: { user_id: userId },
    include: [
      {
        model: db.ProductVariant,
        as: "variant",
        attributes: [
          "id",
          "color",
          "size",
          "stock_quantity",
          "price",
          "sale_price",
        ],
        include: [
          {
            model: db.Product,
            as: "product",
            attributes: [
              "id",
              "name",
              "slug",
              "price",
              "sale_price",
              "approval_status",
              "shop_id",
            ],
            include: [
              {
                model: db.ProductImage,
                as: "images",
                where: { is_primary: true },
                required: false,
                attributes: ["image_url"],
              },
              {
                model: db.Shop,
                as: "shop",
                attributes: ["id", "shop_name", "shop_logo"],
              },
              {
                model: db.ProductVariant,
                as: "variants",
                attributes: [
                  "id",
                  "color",
                  "size",
                  "stock_quantity",
                  "price",
                  "sale_price",
                ],
              },
            ],
          },
        ],
      },
    ],
    order: [["added_at", "DESC"]],
  });

  if (!items || items.length === 0) {
    return { items: [], totalItems: 0, totalAmount: 0 };
  }

  // Lọc bỏ những sản phẩm đã bị xóa hoặc ẩn
  const validItems = items.filter(
    (item) =>
      item.variant &&
      item.variant.product &&
      item.variant.product.approval_status === "APPROVED",
  );

  const totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = validItems.reduce((sum, item) => {
    const currentPrice = Number(item.variant.sale_price || item.variant.price);
    return sum + item.quantity * currentPrice;
  }, 0);

  return { user_id: userId, items: validItems, totalItems, totalAmount };
};

// Thêm sản phẩm vào giỏ hàng
const addItemToCart = async (userId, { variantId, quantity }) => {
  // 1. Kiểm tra variant và sản phẩm
  const variant = await db.ProductVariant.findByPk(variantId, {
    include: [{ model: db.Product, as: "product" }],
  });

  if (
    !variant ||
    !variant.product ||
    variant.product.approval_status !== "APPROVED"
  ) {
    throw new Error("Sản phẩm không tồn tại hoặc đã ngừng bán");
  }

  // 2. Kiểm tra tồn kho
  const stockQuantity = variant.stock_quantity;
  if (stockQuantity < quantity) {
    throw new Error(`Chỉ còn ${stockQuantity} sản phẩm trong kho`);
  }

  // 3. Kiểm tra item đã có trong giỏ chưa
  const existingItem = await db.CartItem.findOne({
    where: {
      user_id: userId,
      variant_id: variantId,
    },
  });

  if (existingItem) {
    // Cập nhật số lượng
    const newQty = existingItem.quantity + quantity;
    if (newQty > stockQuantity) {
      throw new Error(
        `Không thể thêm. Tổng số lượng vượt quá tồn kho (${stockQuantity})`,
      );
    }
    await existingItem.update({ quantity: newQty });
    return existingItem;
  }

  // 4. Tạo item mới
  return await db.CartItem.create({
    user_id: userId,
    variant_id: variantId,
    quantity,
  });
};

// Cập nhật số lượng item
const updateCartItem = async (userId, itemId, quantity, newVariantId) => {
  const item = await db.CartItem.findOne({
    where: { id: itemId, user_id: userId },
    include: [{ model: db.ProductVariant, as: "variant" }],
  });

  if (!item) throw new Error("Sản phẩm không có trong giỏ hàng");

  if (quantity !== undefined && quantity <= 0) {
    await item.destroy();
    return { removed: true };
  }

  const updates = {};
  if (quantity !== undefined) {
    if (
      quantity > item.variant.stock_quantity &&
      (!newVariantId || newVariantId === item.variant_id)
    ) {
      throw new Error(
        `Tổng số lượng vượt quá tồn kho (${item.variant.stock_quantity})`,
      );
    }
    updates.quantity = quantity;
  }

  if (newVariantId !== undefined && newVariantId !== item.variant_id) {
    const newVariant = await db.ProductVariant.findByPk(newVariantId);
    if (!newVariant || newVariant.product_id !== item.variant.product_id) {
      throw new Error("Biến thể sản phẩm không hợp lệ");
    }

    const { Op } = db.Sequelize;
    // Kiểm tra xem giỏ hàng đã có item với variant này chưa
    const existingItem = await db.CartItem.findOne({
      where: {
        user_id: userId,
        variant_id: newVariantId,
        id: { [Op.ne]: item.id },
      },
    });

    if (existingItem) {
      // Gộp số lượng
      const newQty =
        existingItem.quantity +
        (quantity !== undefined ? quantity : item.quantity);
      if (newQty > newVariant.stock_quantity) {
        throw new Error(
          `Tổng số lượng vượt quá tồn kho (${newVariant.stock_quantity})`,
        );
      }
      await existingItem.update({ quantity: newQty });
      await item.destroy();
      return existingItem;
    } else {
      // Cập nhật phân loại
      updates.variant_id = newVariantId;
      if (quantity !== undefined && quantity > newVariant.stock_quantity) {
        throw new Error(
          `Tổng số lượng vượt quá tồn kho (${newVariant.stock_quantity})`,
        );
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await item.update(updates);
  }
  return item;
};

// Xóa item khỏi giỏ
const removeCartItem = async (userId, itemId) => {
  const item = await db.CartItem.findOne({
    where: { id: itemId, user_id: userId },
  });
  if (!item) throw new Error("Sản phẩm không có trong giỏ hàng");

  await item.destroy();
  return true;
};

// Xóa toàn bộ giỏ hàng (sau khi đặt hàng)
const clearCart = async (userId) => {
  await db.CartItem.destroy({ where: { user_id: userId } });
};

export default {
  getCartByUserId,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
