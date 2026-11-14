import express from "express";
import cartController from "./cart.controller.js";
import { verifyToken } from "../../core/middleware/auth.js";

const router = express.Router();

// Tất cả route giỏ hàng đều cần đăng nhập
router.use(verifyToken);

router.get("/", cartController.getCart);
router.post("/items", cartController.addItem);
router.put("/items/:itemId", cartController.updateItem);
router.delete("/items/:itemId", cartController.removeItem);

export default router;
