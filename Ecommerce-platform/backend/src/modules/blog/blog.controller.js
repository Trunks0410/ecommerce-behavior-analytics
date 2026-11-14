import blogService from "./blog.service.js";

const getBlogs = async (req, res) => {
  try {
    const data = await blogService.getBlogs(req.query);
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting blogs:", error);
    return res.status(500).json({ message: error.message || "Lỗi tải danh sách bài viết" });
  }
};

const getBlogBySlug = async (req, res) => {
  try {
    const data = await blogService.getBlogBySlug(req.params.slug);
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting blog by slug:", error);
    return res.status(404).json({ message: error.message || "Không tìm thấy bài viết" });
  }
};

const getManagerBlogs = async (req, res) => {
  try {
    const data = await blogService.getManagerBlogs();
    return res.status(200).json({ message: "Success", data });
  } catch (error) {
    console.error("Error getting manager blogs:", error);
    return res.status(500).json({ message: error.message || "Lỗi tải danh sách quản trị blog" });
  }
};

const createBlog = async (req, res) => {
  try {
    const authorId = req.user.id;
    const data = await blogService.createBlog(req.body, authorId);
    return res.status(201).json({ message: "Tạo bài viết thành công", data });
  } catch (error) {
    console.error("Error creating blog:", error);
    return res.status(400).json({ message: error.message || "Lỗi tạo bài viết" });
  }
};

const updateBlog = async (req, res) => {
  try {
    const data = await blogService.updateBlog(req.params.id, req.body);
    return res.status(200).json({ message: "Cập nhật bài viết thành công", data });
  } catch (error) {
    console.error("Error updating blog:", error);
    return res.status(400).json({ message: error.message || "Lỗi cập nhật bài viết" });
  }
};

const deleteBlog = async (req, res) => {
  try {
    await blogService.deleteBlog(req.params.id);
    return res.status(200).json({ message: "Xóa bài viết thành công" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return res.status(400).json({ message: error.message || "Lỗi xóa bài viết" });
  }
};

export default {
  getBlogs,
  getBlogBySlug,
  getManagerBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
};
