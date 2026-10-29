import categoryService from "./category.service.js";

const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    return res.status(200).json({ message: "Success", data: categories });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    const category = await categoryService.getCategoryBySlug(slug);
    return res.status(200).json({ message: "Success", data: category });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  getAllCategories,
  getCategoryBySlug,
};
