import categoryService from "./category.service.js";

const getReqLang = (req) => {
  const queryLang = req.query.lang;
  if (queryLang) return queryLang.toLowerCase().startsWith("en") ? "en" : "vi";
  const headerLang = req.headers["accept-language"];
  if (headerLang) {
    const primary = headerLang.split(",")[0].trim().toLowerCase();
    if (primary.startsWith("en")) return "en";
    if (primary.startsWith("vi")) return "vi";
  }
  return "vi";
};

const getAllCategories = async (req, res) => {
  try {
    const lang = getReqLang(req);
    const categories = await categoryService.getAllCategories(lang);
    return res.status(200).json({ message: "Success", data: categories });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    const lang = getReqLang(req);
    const category = await categoryService.getCategoryBySlug(slug, lang);
    return res.status(200).json({ message: "Success", data: category });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  getAllCategories,
  getCategoryBySlug,
};
