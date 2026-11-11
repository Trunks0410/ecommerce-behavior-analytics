import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CACHE_DIR = path.resolve(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "translations_cache.json");

// Bộ nhớ đệm cache trong RAM để tránh dịch lặp lại
const translationCache = new Map();
const MAX_CACHE_SIZE = 10000;

// Tự động nạp bộ nhớ đệm bền vững từ đĩa khi khởi động
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      translationCache.set(k, v);
    }
    console.log(`[TranslateService] Loaded ${translationCache.size} persistent translations from disk.`);
  }
} catch (e) {
  console.warn("[TranslateService] Could not load persistent cache:", e.message);
}

let saveTimeout = null;
function scheduleSaveCache() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const obj = Object.fromEntries(translationCache.entries());
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (e) {
      console.warn("[TranslateService] Failed saving cache to disk:", e.message);
    }
  }, 2000);
}

/**
 * Dịch văn bản qua Google Translate Free Endpoint (Option D - Fallback)
 * Dùng native fetch() để bypass các cơ chế bot-detection của Google
 */
async function translateWithGoogle(text, from = "vi", to = "en") {
  if (!text || typeof text !== "string" || !text.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    });
    const data = await res.json();
    if (data && Array.isArray(data[0])) {
      const translated = data[0].map((item) => item[0]).join("");
      return translated || text;
    }
    return text;
  } catch (err) {
    console.warn(`[Google Translate Error] for "${text}":`, err.message);
    return text;
  }
}

/**
 * Dịch văn bản qua Gemini 2.5 Flash API (Option C - Ưu tiên)
 */
async function translateWithGemini(texts, from = "vi", to = "en") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const targetLang = to === "vi" ? "Vietnamese" : to === "en" ? "English" : to;
  const sourceLang = from === "vi" ? "Vietnamese" : from === "en" ? "English" : "the original language";

  try {
    const prompt = `You are a professional e-commerce localization expert. Translate the following product text array from ${sourceLang} into natural, appealing, standard ${targetLang} suitable for a top e-commerce platform like Shopee, Lazada, or Tiki.
Preserve original brand names (e.g. AmazonBasics, Nike, Solimo, Samsung, Apple), model numbers, specifications, dimensions, and punctuation.
Translate descriptive product types and features naturally into ${targetLang}.
Return ONLY a valid JSON array of strings in the exact same order as the input array.

Input array:
${JSON.stringify(texts)}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const json = await res.json();
    const rawJson = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawJson) {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.length === texts.length) {
        return parsed;
      }
    }
    return null;
  } catch (err) {
    console.warn("[Gemini Translate Error]:", err.message);
    return null;
  }
}

/**
 * Dịch một mảng chuỗi văn bản (Tự động chuyển đổi giữa Gemini và Google Translate)
 */
export async function translateTexts(texts, from = "vi", to = "en") {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const results = new Array(texts.length);
  const uncachedIndices = [];
  const uncachedTexts = [];

  // 1. Kiểm tra cache trước
  texts.forEach((txt, idx) => {
    if (!txt || typeof txt !== "string" || !txt.trim()) {
      results[idx] = txt;
      return;
    }
    const cacheKey = `${from}_${to}_${txt.trim()}`;
    if (translationCache.has(cacheKey)) {
      results[idx] = translationCache.get(cacheKey);
    } else {
      uncachedIndices.push(idx);
      uncachedTexts.push(txt.trim());
    }
  });

  if (uncachedTexts.length === 0) {
    return results;
  }

  // 2. Thử dịch bằng Gemini (Option C) nếu có API key
  let translatedBatch = null;
  if (process.env.GEMINI_API_KEY) {
    translatedBatch = await translateWithGemini(uncachedTexts, from, to);
  }

  // 3. Fallback sang Google Translate (Option D) nếu Gemini không khả dụng hoặc lỗi
  if (!translatedBatch) {
    translatedBatch = await Promise.all(
      uncachedTexts.map((txt) => translateWithGoogle(txt, from, to))
    );
  }

  // 4. Lưu vào cache và điền kết quả
  uncachedIndices.forEach((origIdx, batchIdx) => {
    const originalText = uncachedTexts[batchIdx];
    const translatedText = translatedBatch[batchIdx] || originalText;
    const cacheKey = `${from}_${to}_${originalText}`;

    if (translationCache.size >= MAX_CACHE_SIZE) {
      // Xóa phần tử đầu tiên nếu cache đầy
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    results[origIdx] = translatedText;
  });

  scheduleSaveCache();

  return results;
}

/**
 * Dịch một chuỗi đơn lẻ
 */
export async function translateSingleText(text, from = "vi", to = "en") {
  const [res] = await translateTexts([text], from, to);
  return res || text;
}

export default {
  translateTexts,
  translateSingleText,
};
