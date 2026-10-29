import cartService from "./cart.service.js";

const getCart = async (req, res) => {
  try {
    const cart = await cartService.getCartByUserId(req.user.id);
    return res.status(200).json({ message: "Success", data: cart });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const addItem = async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    if (!productId)
      return res.status(400).json({ message: "productId là bắt buộc" });

    const item = await cartService.addItemToCart(req.user.id, {
      productId,
      variantId,
      quantity,
    });
    return res
      .status(200)
      .json({ message: "Thêm vào giỏ hàng thành công", data: item });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { quantity, product_variant_id } = req.body;
    const result = await cartService.updateCartItem(
      req.user.id,
      req.params.itemId,
      quantity,
      product_variant_id
    );
    return res
      .status(200)
      .json({ message: "Cập nhật thành công", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const removeItem = async (req, res) => {
  try {
    await cartService.removeCartItem(req.user.id, req.params.itemId);
    return res.status(200).json({ message: "Đã xóa sản phẩm khỏi giỏ hàng" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export default { getCart, addItem, updateItem, removeItem };
