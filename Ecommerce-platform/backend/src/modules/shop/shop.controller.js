import shopService from "./shop.service.js";
import returnService from "../return/return.service.js";
import db from "../../database/models/index.js";

const registerShop = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ verifyToken middleware
    const shop = await shopService.registerShop(userId, req.body);
    return res.status(201).json({ message: "Register shop successfully", data: shop });
  } catch (error) {
    console.error("Error registering shop:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const getShopProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await shopService.getShopProfile(id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    return res.status(200).json({ message: "Success", data: shop });
  } catch (error) {
    console.error("Error getting shop profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getTopShops = async (req, res) => {
  try {
    const { limit } = req.query;
    const shops = await shopService.getTopShops(limit);
    return res.status(200).json({ message: "Success", data: shops });
  } catch (error) {
    console.error("Error getting top shops:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAllShops = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const result = await shopService.getAllShops(search, page, limit);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    console.error("Error getting all shops:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getMyShop = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "You don't have a registered shop" });
    }
    return res.status(200).json({ message: "Success", data: shop });
  } catch (error) {
    console.error("Error getting my shop:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updateMyShop = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.updateShop(userId, req.body);
    return res.status(200).json({ message: "Update shop successfully", data: shop });
  } catch (error) {
    console.error("Error updating shop:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const getShopStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const statistics = await shopService.getShopStatistics(shop.id);
    return res.status(200).json({ message: "Success", data: statistics });
  } catch (error) {
    console.error("Error getting shop stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getShopOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const orders = await shopService.getShopOrders(shop.id);
    return res.status(200).json({ message: "Success", data: orders });
  } catch (error) {
    console.error("Error getting shop orders:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const createProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const product = await shopService.createShopProduct(shop.id, req.body);
    return res.status(201).json({ message: "Create product successfully", data: product });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const { id } = req.params;
    const product = await shopService.updateShopProduct(shop.id, id, req.body);
    return res.status(200).json({ message: "Update product successfully", data: product });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const { id } = req.params;
    await shopService.deleteShopProduct(shop.id, id);
    return res.status(200).json({ message: "Delete product successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// Vouchers (Coupons)
const getShopVouchers = async (req, res) => {
  try {
    const { id } = req.params; // Lấy shopId từ params
    const vouchers = await db.Coupon.findAll({
      where: { shop_id: id },
    });
    return res.status(200).json({ message: "Success", data: vouchers });
  } catch (error) {
    console.error("Error getting shop vouchers:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const createShopVoucher = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount,
      usage_limit,
      start_date,
      end_date,
      category_id,
    } = req.body;

    // Map discount_type từ frontend sang model enum (PERCENT, FIXED)
    let finalDiscountType = "PERCENT";
    if (discount_type === "FIXED_AMOUNT" || discount_type === "FIXED" || discount_type === "FIXED_VALUE") {
      finalDiscountType = "FIXED";
    }

    const voucher = await db.Coupon.create({
      code,
      description,
      discount_type: finalDiscountType,
      discount_value,
      min_order_amount: min_order_amount || 0.00,
      max_discount: max_discount || null,
      usage_limit: usage_limit || null,
      used_count: 0,
      start_date: start_date || new Date(),
      end_date: end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      shop_id: shop.id,
      category_id: category_id || null,
    });

    return res.status(201).json({ message: "Create voucher successfully", data: voucher });
  } catch (error) {
    console.error("Error creating voucher:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const deleteShopVoucher = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const { id } = req.params;
    const voucher = await db.Coupon.findOne({
      where: { id, shop_id: shop.id },
    });
    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    // Thực hiện soft delete qua paranoid của Sequelize
    await voucher.destroy();
    return res.status(200).json({ message: "Delete voucher successfully" });
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getShopReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const reviews = await shopService.getShopReviews(shop.id);
    return res.status(200).json({ message: "Success", data: reviews });
  } catch (error) {
    console.error("Error getting shop reviews:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const replyToReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    
    const { id } = req.params;
    const { vendor_reply } = req.body;
    
    if (!vendor_reply) {
      return res.status(400).json({ error: "Nội dung phản hồi không được để trống" });
    }

    const updatedReview = await shopService.replyToReview(shop.id, id, vendor_reply);
    return res.status(200).json({ message: "Gửi phản hồi thành công", data: updatedReview });
  } catch (error) {
    console.error("Error replying to review:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Vui lòng chọn ảnh để tải lên" });
    }
    const imageUrl = req.file.path;
    return res.status(200).json({
      message: "Tải ảnh lên thành công",
      url: imageUrl,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getShopReturnRequests = async (req, res) => {
  try {
    const shop = await shopService.getShopByUserId(req.user.id);
    if (!shop) return res.status(404).json({ message: "Không tìm thấy shop" });
    const result = await returnService.getReturnRequestsByShop(shop.id, req.query);
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const approveReturnRequest = async (req, res) => {
  try {
    const shop = await shopService.getShopByUserId(req.user.id);
    if (!shop) return res.status(404).json({ message: "Không tìm thấy shop" });
    const { id } = req.params;
    const result = await returnService.vendorApproveReturn(shop.id, id);
    return res.status(200).json({ message: "Chấp nhận trả hàng thành công", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const rejectReturnRequest = async (req, res) => {
  try {
    const shop = await shopService.getShopByUserId(req.user.id);
    if (!shop) return res.status(404).json({ message: "Không tìm thấy shop" });
    const { id } = req.params;
    const { rejectNote } = req.body;
    const result = await returnService.vendorRejectReturn(shop.id, id, rejectNote);
    return res.status(200).json({ message: "Từ chối trả hàng thành công", data: result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Không tìm thấy Shop" });
    }
    const withdrawal = await shopService.requestWithdrawal(shop.id, req.body);
    return res.status(201).json({ message: "Yêu cầu rút tiền thành công", data: withdrawal });
  } catch (error) {
    console.error("Error requesting withdrawal:", error);
    return res.status(400).json({ message: error.message || "Lỗi xử lý yêu cầu rút tiền" });
  }
};

const getShopProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Không tìm thấy Shop" });
    }
    const { page = 1, limit = 5 } = req.query;
    const result = await shopService.getShopProducts(shop.id, { page, limit });
    return res.status(200).json({ message: "Success", data: result });
  } catch (error) {
    console.error("Error getting shop products:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

const getWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;
    const shop = await shopService.getShopByUserId(userId);
    if (!shop) {
      return res.status(404).json({ message: "Không tìm thấy Shop" });
    }
    const withdrawals = await shopService.getWithdrawals(shop.id);
    return res.status(200).json({ message: "Success", data: withdrawals });
  } catch (error) {
    console.error("Error getting withdrawals:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  registerShop,
  getShopProfile,
  getMyShop,
  updateMyShop,
  getShopStatistics,
  getShopOrders,
  createProduct,
  updateProduct,
  deleteProduct,
  getShopProducts,
  getShopVouchers,
  createShopVoucher,
  deleteShopVoucher,
  getShopReviews,
  replyToReview,
  uploadImage,
  getShopReturnRequests,
  approveReturnRequest,
  rejectReturnRequest,
  requestWithdrawal,
  getWithdrawals,
  getTopShops,
  getAllShops,
};
