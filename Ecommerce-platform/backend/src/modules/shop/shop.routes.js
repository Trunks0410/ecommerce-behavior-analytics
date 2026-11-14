import express from "express";
import shopController from "./shop.controller.js";
import { verifyToken, isVendor } from "../../core/middleware/auth.js";
import upload from "../../core/middleware/upload.js";

const router = express.Router();

// Routes công khai (Public)
router.get("/", shopController.getAllShops);
router.get("/top", shopController.getTopShops);
router.get("/:id", shopController.getShopProfile);
router.get("/:id/vouchers", shopController.getShopVouchers);

// Các routes cần đăng nhập (Protected)
router.use(verifyToken);

// Chỉ đăng ký mới shop là cho phép User thường chưa có vai trò Vendor
router.post("/", shopController.registerShop);
router.get("/my-shop/info", shopController.getMyShop);

// Các routes quản trị shop chỉ dành riêng cho Vendor
router.use(isVendor);

router.put("/my-shop/info", shopController.updateMyShop);
router.get("/my-shop/statistics", shopController.getShopStatistics);
router.get("/my-shop/orders", shopController.getShopOrders);
router.get("/my-shop/reviews", shopController.getShopReviews);

// Quản lý sản phẩm của shop
router.get("/my-shop/products", shopController.getShopProducts);
router.post("/my-shop/products", shopController.createProduct);
router.put("/my-shop/products/:id", shopController.updateProduct);
router.delete("/my-shop/products/:id", shopController.deleteProduct);

// Quản lý khuyến mãi của shop
router.post("/my-shop/vouchers", shopController.createShopVoucher);
router.delete("/my-shop/vouchers/:id", shopController.deleteShopVoucher);

// Quản lý tài chính & Rút tiền của shop
router.post("/my-shop/withdraw", shopController.requestWithdrawal);
router.get("/my-shop/withdrawals", shopController.getWithdrawals);

// Tải ảnh lên từ thiết bị
router.post("/my-shop/upload", upload.single("image"), shopController.uploadImage);

// Quản lý yêu cầu trả hàng
router.get("/my-shop/returns", shopController.getShopReturnRequests);
router.post("/my-shop/returns/:id/approve", shopController.approveReturnRequest);
router.post("/my-shop/returns/:id/reject", shopController.rejectReturnRequest);

// Trả lời bình luận
router.post("/my-shop/reviews/:id/reply", shopController.replyToReview);

export default router;
