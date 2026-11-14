import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env từ backend nếu có GEMINI_API_KEY
const backendEnvPath = path.resolve(__dirname, "../../backend/.env");
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
dotenv.config();

const viFilePath = path.resolve(__dirname, "../src/shared/locales/vi.ts");
const enFilePath = path.resolve(__dirname, "../src/shared/locales/en.ts");

/**
 * Trích xuất object key-value từ file TypeScript export
 */
function extractTranslationsFromFile(content) {
  const result = {};
  // Regex tìm cặp key: "value" hoặc key: 'value'
  const regex = /^\s*([a-zA-Z0-9_]+)\s*:\s*(["'`])((?:\\.|[^\\])*?)\2\s*,?/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    let val = match[3];
    // Unescape quotes
    val = val.replace(/\\"/g, '"').replace(/\\'/g, "'");
    result[key] = val;
  }
  return result;
}

/**
 * Dịch văn bản qua Google Translate Free Endpoint
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
      return data[0].map((item) => item[0]).join("") || text;
    }
    return text;
  } catch (err) {
    console.warn(`[Google Translate Error] for "${text}":`, err.message);
    return text;
  }
}

/**
 * Dịch mảng chuỗi qua Gemini 2.5 Flash API
 */
async function translateWithGemini(texts, from = "vi", to = "en") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are a professional e-commerce localization expert. Translate the following ${from === "vi" ? "Vietnamese" : from} text array into natural, standard English suitable for a top e-commerce platform like Shopee or Amazon.
Preserve product brand names, numbers, prices, and formatting symbols.
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
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length === texts.length) {
        return parsed;
      }
    }
    return null;
  } catch (err) {
    console.warn("[Gemini Translate CLI Error]:", err.message);
    return null;
  }
}

/**
 * Hàm thực thi đồng bộ và tự động dịch
 */
async function runSync() {
  console.log("=================================================");
  console.log("🚀 BẮT ĐẦU ĐỒNG BỘ & DỊCH TỰ ĐỘNG TỪ ĐIỂN i18n");
  console.log("=================================================");

  if (!fs.existsSync(viFilePath)) {
    console.error(`❌ Không tìm thấy tệp nguồn tiếng Việt tại: ${viFilePath}`);
    process.exit(1);
  }

  const viContent = fs.readFileSync(viFilePath, "utf8");
  const enContent = fs.existsSync(enFilePath) ? fs.readFileSync(enFilePath, "utf8") : "";

  const viMap = extractTranslationsFromFile(viContent);
  const enMap = extractTranslationsFromFile(enContent);

  const viKeys = Object.keys(viMap);
  console.log(`📌 Tìm thấy tổng cộng ${viKeys.length} keys trong vi.ts`);

  const missingKeys = viKeys.filter((key) => !enMap[key] || enMap[key].trim() === "");
  console.log(`🔍 Số keys tiếng Anh còn thiếu hoặc cần cập nhật: ${missingKeys.length}`);

  if (missingKeys.length === 0) {
    console.log("✅ Tệp en.ts đã đầy đủ và đồng bộ 100% với vi.ts!");
    return;
  }

  const BATCH_SIZE = 25;
  const updatedEnMap = { ...enMap };
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  console.log(`🤖 Chế độ dịch AI: ${hasGemini ? "Gemini 2.5 Flash API (Option C)" : "Google Translate Free (Option D)"}`);

  for (let i = 0; i < missingKeys.length; i += BATCH_SIZE) {
    const batchKeys = missingKeys.slice(i, i + BATCH_SIZE);
    const batchTexts = batchKeys.map((k) => viMap[k]);

    console.log(`🔄 Đang dịch batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missingKeys.length / BATCH_SIZE)} (${batchKeys.length} items)...`);

    let translated = null;
    if (hasGemini) {
      translated = await translateWithGemini(batchTexts, "vi", "en");
    }

    if (!translated) {
      translated = await Promise.all(
        batchTexts.map((text) => translateWithGoogle(text, "vi", "en"))
      );
    }

    batchKeys.forEach((key, idx) => {
      updatedEnMap[key] = translated[idx] || viMap[key];
    });

    // Khoảng dừng nhẹ tránh rate limit
    await new Promise((r) => setTimeout(r, 400));
  }

  // Tạo nội dung tệp en.ts chuẩn TypeScript
  const lines = [
    'import { TranslationKey } from "./vi";',
    "",
    "export const en: Record<TranslationKey, string> = {",
  ];

  viKeys.forEach((key) => {
    const val = updatedEnMap[key] || viMap[key];
    // Escape dấu ngoặc kép an toàn
    const escapedVal = String(val)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
    lines.push(`  ${key}: "${escapedVal}",`);
  });

  lines.push("};", "");

  fs.writeFileSync(enFilePath, lines.join("\n"), "utf8");
  console.log(`🎉 HOÀN TẤT! Đã đồng bộ và dịch thành công ${missingKeys.length} keys vào: src/shared/locales/en.ts`);
}

runSync().catch((err) => {
  console.error("❌ Lỗi đồng bộ:", err);
  process.exit(1);
});
