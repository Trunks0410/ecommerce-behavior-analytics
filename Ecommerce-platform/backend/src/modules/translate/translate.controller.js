import translateService from "./translate.service.js";

// POST /api/translate
export const handleTranslate = async (req, res, next) => {
  try {
    const { text, texts, from = "vi", to = "en" } = req.body;

    if (text && typeof text === "string") {
      const translated = await translateService.translateSingleText(text, from, to);
      return res.status(200).json({
        success: true,
        data: {
          original: text,
          translated,
          from,
          to,
        },
      });
    }

    if (Array.isArray(texts)) {
      const translatedList = await translateService.translateTexts(texts, from, to);
      return res.status(200).json({
        success: true,
        data: {
          original: texts,
          translated: translatedList,
          from,
          to,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp 'text' (chuỗi) hoặc 'texts' (mảng chuỗi) để dịch.",
    });
  } catch (err) {
    return next(err);
  }
};

export default {
  handleTranslate,
};

