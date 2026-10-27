import express from "express";
import blogController from "./blog.controller.js";
import { verifyToken, isManager } from "../../core/middleware/auth.js";
import upload from "../../core/middleware/upload.js";

const router = express.Router();

// ---- 1. Public Blog Routes ----
router.get("/blogs", blogController.getBlogs);
router.get("/blogs/:slug", blogController.getBlogBySlug);

// ---- 2. Manager Blog Routes ----
// Đăng ký middleware bảo vệ quyền Manager
router.get("/manager/blogs", verifyToken, isManager, blogController.getManagerBlogs);
router.post("/manager/blogs", verifyToken, isManager, blogController.createBlog);
router.put("/manager/blogs/:id", verifyToken, isManager, blogController.updateBlog);
router.delete("/manager/blogs/:id", verifyToken, isManager, blogController.deleteBlog);

// API upload hình ảnh blog của Manager lên Cloudinary
router.post(
  "/manager/blogs/upload",
  verifyToken,
  isManager,
  upload.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Vui lòng chọn ảnh để tải lên" });
      }
      return res.status(200).json({
        message: "Tải ảnh lên thành công",
        url: req.file.path, // Cloudinary URL
      });
    } catch (error) {
      console.error("Error uploading blog image:", error);
      return res.status(500).json({ message: error.message });
    }
  }
);

export default router;
