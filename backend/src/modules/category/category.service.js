import db from "../../database/models/index.js";

/**
 * Lấy toàn bộ danh mục gốc (parent_id = null) kèm danh mục con.
 */
const getAllCategories = async () => {
  return await db.Category.findAll({
    attributes: ["id", "name", "slug", "parent_id", "image_url", "description"],
    order: [["name", "ASC"]],
  });
};

/**
 * Lấy một danh mục theo slug, kèm danh mục con.
 */
const getCategoryBySlug = async (slug) => {
  return await db.Category.findOne({
    where: { slug },
    include: [
      {
        model: db.Category,
        as: "children",
        attributes: ["id", "name", "slug", "image_url"],
      },
    ],
  });
};

export default {
  getAllCategories,
  getCategoryBySlug,
};
