import db from "../../database/models/index.js";
import axios from "axios";

// Danh sách từ dừng (stop words) để lọc từ khóa tìm kiếm chính xác
const stopWords = new Set([
  "có", "không", "bao", "nhiêu", "tìm", "mua", "bán", "cần", "á", "ơi", "ad", "admin",
  "bạn", "tôi", "mình", "shop", "cửa", "hàng", "sản", "phẩm", "thế", "nào", "gì", "đâu",
  "cho", "hỏi", "với", "nhé", "nha", "được", "ko", "k", "nào", "mẫu", "loại", "này", "cái",
  "tôi", "cho", "em", "vài", "những"
]);

const getSystemPromptAndProducts = async (userMessage) => {
  const { Op } = db.Sequelize;

  // Lọc từ khóa tìm kiếm chất lượng
  const words = userMessage
    .toLowerCase()
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  let productsContext = "";
  let matchedProducts = [];

  if (words.length > 0) {
    try {
      const productMatches = await db.Product.findAll({
        where: {
          approval_status: "APPROVED",
          [Op.or]: words.map((word) => ({
            name: { [Op.like]: `%${word}%` },
          })),
        },
        include: [{
          model: db.ProductImage,
          as: "images",
          where: { is_primary: true },
          required: false,
          attributes: ["image_url"]
        }],
        limit: 5,
        attributes: ["id", "name", "price", "description", "slug"],
      });

      if (productMatches && productMatches.length > 0) {
        matchedProducts = productMatches.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          slug: p.slug,
          image_url: p.images?.[0]?.image_url || null
        }));

        productsContext = productMatches
          .map(
            (p) =>
              `- Sản phẩm: [${p.name}](http://localhost:5173/products/${p.slug}) | Giá: ${Number(
                p.price
              ).toLocaleString("vi-VN")}đ`
          )
          .join("\n");
      }
    } catch (err) {
      console.error("Lỗi truy vấn sản phẩm RAG:", err);
    }
  }

  const systemPrompt = `Bạn là một nhân viên tư vấn bán hàng chuyên nghiệp, thân thiện và nhiệt tình của sàn thời trang UTEShop.
Dưới đây là một số thông tin chính sách của sàn thời trang UTEShop:
- Thanh toán: Hỗ trợ thanh toán tiền mặt khi nhận hàng (COD), thẻ tín dụng (Visa, Master) và cổng VNPay.
- Đổi trả hàng: Khách hàng được đổi trả sản phẩm trong vòng 7 ngày kể từ khi nhận hàng thành công đối với sản phẩm lỗi nhà sản xuất hoặc nhầm kích thước. Sản phẩm đổi trả phải còn nguyên tem mác.
- Phí vận chuyển: Giao hàng nhanh toàn quốc với mức phí đồng giá 30.000đ. Với các đơn hàng có giá trị thanh toán từ 500.000đ trở lên, hệ thống sẽ tự động miễn phí vận chuyển.

Dưới đây là danh sách sản phẩm liên quan đang bán trên hệ thống khớp với câu hỏi của khách hàng:
${productsContext || "Không tìm thấy sản phẩm nào khớp chính xác trong hệ thống."}

Quy định trả lời khách hàng:
1. Đóng vai là một nhân viên bán hàng chu đáo, vui vẻ, chào đón khách hàng nhiệt tình.
2. Trả lời bằng tiếng Việt lịch sự, ngắn gọn và tập trung giải quyết câu hỏi.
3. Nếu tìm thấy sản phẩm trong danh sách trên, hãy giới thiệu sản phẩm kèm giá bán và dẫn link chính xác theo định dạng [Tên sản phẩm](http://localhost:5173/products/ID) như được cung cấp để khách hàng có thể click vào xem chi tiết ngay lập tức.
4. Nếu danh sách trên báo "Không tìm thấy sản phẩm nào khớp chính xác", hãy khéo léo thông báo cho khách là hiện tại sàn chưa có dòng sản phẩm này, sau đó gợi ý họ xem các sản phẩm thời trang khác và không tự bịa ra link sản phẩm.`;

  return { systemPrompt, products: matchedProducts };
};

// Gọi OpenAI API
const callOpenAIAPI = async (apiKey, systemPrompt, message) => {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      timeout: 30000,
    }
  );
  return response;
};

// Gọi Gemini API
const callGeminiAPI = async (apiKey, systemPrompt, message) => {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
    {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            { text: `Khách hàng hỏi: "${message}"` },
          ],
        },
      ],
    },
    {
      timeout: 30000,
    }
  );
  return response;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fallback cục bộ khi API lỗi hoặc hết hạn mức/chưa có key
const generateLocalFallbackResponse = async (message) => {
  const lowercaseMsg = message.toLowerCase();
  const { Op } = db.Sequelize;

  // 1. Phí vận chuyển / ship / giao hàng
  if (
    lowercaseMsg.includes("ship") ||
    lowercaseMsg.includes("vận chuyển") ||
    lowercaseMsg.includes("giao hàng") ||
    lowercaseMsg.includes("phí")
  ) {
    return {
      reply: `Dạ chào bạn! Hiện tại UTEShop hỗ trợ giao hàng nhanh toàn quốc đồng giá chỉ **30.000đ** thôi ạ.
Đặc biệt hơn, nếu đơn hàng của mình có giá trị từ **500.000đ** trở lên, hệ thống bên mình sẽ tự động **miễn phí vận chuyển (Freeship)** luôn đó nha! Bạn có cần mình hỗ trợ chọn mẫu sản phẩm nào không ạ?`,
      products: []
    };
  }

  // 2. Đổi trả / trả hàng / đổi size
  if (
    lowercaseMsg.includes("đổi trả") ||
    lowercaseMsg.includes("trả hàng") ||
    lowercaseMsg.includes("đổi size") ||
    lowercaseMsg.includes("hoàn tiền") ||
    lowercaseMsg.includes("size")
  ) {
    return {
      reply: `Dạ chào bạn! Về chính sách đổi trả bên UTEShop rất linh hoạt để hỗ trợ khách hàng tốt nhất ạ:
- Bạn sẽ được hỗ trợ đổi hoặc trả hàng trong vòng **7 ngày** kể từ khi nhận sản phẩm thành công.
- Áp dụng khi sản phẩm bị lỗi sản xuất, bị rách hoặc nhầm size/mẫu ạ.
- Bạn lưu ý giữ sản phẩm còn nguyên tem mác, chưa qua giặt ủi hay sử dụng giúp shop nhé!`,
      products: []
    };
  }

  // 3. Thanh toán / vnpay / cod / thẻ
  if (
    lowercaseMsg.includes("thanh toán") ||
    lowercaseMsg.includes("vnpay") ||
    lowercaseMsg.includes("cod") ||
    lowercaseMsg.includes("chuyển khoản")
  ) {
    return {
      reply: `Dạ bên UTEShop hỗ trợ rất nhiều phương thức thanh toán tiện lợi cho mình lựa chọn ạ:
1. **COD:** Nhận hàng rồi mới thanh toán tiền mặt trực tiếp cho shipper.
2. **Thanh toán trực tuyến qua cổng VNPay:** Quét mã QR hoặc dùng Internet Banking.
3. **Thẻ quốc tế:** Hỗ trợ thẻ Visa, Mastercard.
Bạn thích phương thức nào thì cứ chọn lúc đặt hàng nhé ạ!`,
      products: []
    };
  }

  // 4. Tìm kiếm sản phẩm
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  if (words.length > 0) {
    try {
      const productMatches = await db.Product.findAll({
        where: {
          approval_status: "APPROVED",
          [Op.or]: words.map((word) => ({
            name: { [Op.like]: `%${word}%` },
          })),
        },
        include: [{
          model: db.ProductImage,
          as: "images",
          where: { is_primary: true },
          required: false,
          attributes: ["image_url"]
        }],
        limit: 5,
        attributes: ["id", "name", "price", "slug"],
      });

      if (productMatches && productMatches.length > 0) {
        const formatted = productMatches.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          slug: p.slug,
          image_url: p.images?.[0]?.image_url || null
        }));

        let reply = `Dạ chào bạn! UTEShop rất vui được phục vụ bạn ạ. Mình tìm thấy một số sản phẩm phù hợp với nhu cầu của bạn đây nhé:\n\n`;
        productMatches.forEach((p) => {
          reply += `- **[${p.name}](http://localhost:5173/products/${p.slug})** | Giá: ${Number(p.price).toLocaleString("vi-VN")}đ\n`;
        });
        reply += `\nBạn bấm vào link để xem chi tiết mẫu và đặt hàng nha. Cần hỗ trợ thêm về size cứ nhắn shop nhé!`;
        
        return { reply, products: formatted };
      }
    } catch (err) {
      console.error("Lỗi fallback tìm sản phẩm:", err);
    }
  }

  // 5. Câu trả lời mặc định nếu không khớp từ khóa nào
  return {
    reply: `Dạ xin chào! Em là trợ lý tư vấn bán hàng của UTEShop ạ. Chị/Anh cần em hỗ trợ thông tin gì thế ạ?
- **Chính sách đổi trả:** Trong vòng 7 ngày (giữ nguyên tem mác).
- **Vận chuyển:** Đồng giá 30k toàn quốc, đơn từ 500k được Freeship ạ.
- **Thanh toán:** Hỗ trợ nhận hàng thanh toán (COD) hoặc qua cổng VNPay/thẻ Visa.

Hoặc anh/chị có thể nhập từ khóa tên sản phẩm để em tìm nhanh giúp mình nha!`,
    products: []
  };
};

const chatWithAI = async (message) => {
  const openAIKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  
  const { systemPrompt, products } = await getSystemPromptAndProducts(message);
  const maxRetries = 2;

  // ƯU TIÊN 1: Dùng OpenAI nếu có key
  if (openAIKey && openAIKey.trim().startsWith("sk-")) {
    console.log("[AI Chat] Đang gọi OpenAI API...");
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await callOpenAIAPI(openAIKey, systemPrompt, message);
        if (response.data?.choices?.[0]?.message?.content) {
          return {
            reply: response.data.choices[0].message.content,
            products
          };
        }
      } catch (error) {
        console.error(`[AI Chat] Lỗi OpenAI (Attempt ${attempt + 1}):`, error.response?.data || error.message);
        if (error.response?.status === 429 && attempt < maxRetries) {
          await delay((attempt + 1) * 2000);
          continue;
        }
        break;
      }
    }
  }

  // ƯU TIÊN 2: Dùng Gemini nếu có key
  if (geminiKey && geminiKey.trim()) {
    console.log("[AI Chat] Đang gọi Gemini API...");
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await callGeminiAPI(geminiKey, systemPrompt, message);
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return {
            reply: response.data.candidates[0].content.parts[0].text,
            products
          };
        }
      } catch (error) {
        console.error(`[AI Chat] Lỗi Gemini (Attempt ${attempt + 1}):`, error.response?.data || error.message);
        if (error.response?.status === 429 && attempt < maxRetries) {
          await delay((attempt + 1) * 2000);
          continue;
        }
        break;
      }
    }
  }

  // ƯU TIÊN 3: Chạy chế độ Fallback
  console.log("[AI Chat] Chạy bằng Local Fallback.");
  return await generateLocalFallbackResponse(message);
};

export default {
  chatWithAI,
};
