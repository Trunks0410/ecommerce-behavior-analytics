import db from "../../database/models/index.js";
import { getOrSetCache } from "../../core/cache/redis.js";
import translateService from "../translate/translate.service.js";

const isVietnameseText = (text) =>
  Boolean(text && /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(text));

const enrichCategoriesTranslation = async (categories, targetLang = "vi") => {
  if (!categories || categories.length === 0) return categories;
  const normalizedLang = targetLang?.toLowerCase()?.startsWith("en") ? "en" : "vi";

  const toTranslate = [];
  const toTranslateIndices = [];

  const list = categories.map((c) => (typeof c.toJSON === "function" ? c.toJSON() : { ...c }));

  list.forEach((raw, idx) => {
    if (normalizedLang === "en" && isVietnameseText(raw.name)) {
      toTranslate.push(raw.name);
      toTranslateIndices.push(idx);
    } else if (normalizedLang === "vi" && !isVietnameseText(raw.name)) {
      toTranslate.push(raw.name);
      toTranslateIndices.push(idx);
    }
  });

  if (toTranslate.length > 0) {
    try {
      const fromLang = normalizedLang === "en" ? "vi" : "auto";
      const translated = await translateService.translateTexts(toTranslate, fromLang, normalizedLang);
      toTranslateIndices.forEach((catIdx, i) => {
        if (translated[i]) {
          list[catIdx].original_name = list[catIdx].name;
          list[catIdx].name = translated[i];
        }
      });
    } catch (e) {
      console.warn("Category translation error:", e.message);
    }
  }

  return list;
};

/**
 * Lấy toàn bộ danh mục gốc (parent_id = null) kèm danh mục con.
 */
const fetchAllCategories = async (lang = "vi") => {
  const rows = await db.Category.findAll({
    attributes: ["id", "name", "slug", "parent_id", "image_url", "description"],
    order: [["name", "ASC"]],
  });
  return await enrichCategoriesTranslation(rows, lang);
};

/**
 * Lấy một danh mục theo slug, kèm danh mục con.
 */
const fetchCategoryBySlug = async (slug, lang = "vi") => {
  const cat = await db.Category.findOne({
    where: { slug },
    include: [
      {
        model: db.Category,
        as: "children",
        attributes: ["id", "name", "slug", "image_url"],
      },
    ],
  });
  if (!cat) return null;
  const [enriched] = await enrichCategoriesTranslation([cat], lang);
  if (enriched && Array.isArray(enriched.children) && enriched.children.length > 0) {
    enriched.children = await enrichCategoriesTranslation(enriched.children, lang);
  }
  return enriched;
};

const getAllCategories = (lang = "vi") =>
  getOrSetCache(`categories:all:${lang}`, () => fetchAllCategories(lang));

const getCategoryBySlug = (slug, lang = "vi") =>
  getOrSetCache(`categories:slug:${slug}:${lang}`, () => fetchCategoryBySlug(slug, lang));

export default {
  getAllCategories,
  getCategoryBySlug,
};
