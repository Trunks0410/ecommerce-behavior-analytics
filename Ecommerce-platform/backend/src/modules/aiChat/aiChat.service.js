import db from "../../database/models/index.js";
import axios from "axios";

// Từ điển ánh xạ trạng thái đơn hàng sang tiếng Việt
const ORDER_STATUS_MAP = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chuẩn bị hàng",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  COMPLETED: "Đã hoàn thành",
  CANCEL_REQUESTED: "Yêu cầu hủy đơn",
  CANCELLED: "Đã hủy đơn",
  FAILED: "Giao hàng thất bại",
  RETURN_PENDING: "Chờ trả hàng",
  RETURNED: "Đã trả hàng",
};

// Từ điển ánh xạ trạng thái vận chuyển UTE Express
const SHIPMENT_STATUS_MAP = {
  PENDING_PICKUP: "Chờ lấy hàng từ Shop",
  PICKED_UP: "Đã lấy hàng về kho UTE Express",
  IN_TRANSIT: "Đang luân chuyển qua bưu cục",
  OUT_FOR_DELIVERY: "Shipper đang trên đường giao đến bạn",
  DELIVERED: "Giao hàng thành công",
  FAILED: "Giao hàng không thành công",
  RETURNED: "Đã hoàn trả về người gửi",
};

// Stop words tiếng Việt lọc từ khóa tìm kiếm
const stopWords = new Set([
  "có", "không", "bao", "nhiêu", "tìm", "mua", "bán", "cần", "á", "ơi", "ad", "admin",
  "bạn", "tôi", "mình", "shop", "cửa", "hàng", "sản", "phẩm", "thế", "nào", "gì", "đâu",
  "cho", "hỏi", "với", "nhé", "nha", "được", "ko", "k", "nào", "mẫu", "loại", "này", "cái",
  "em", "vài", "những", "giúp", "tư", "vấn", "xem", "chỉ", "với"
]);

/**
 * Lấy thông tin tóm tắt của người dùng nếu đã đăng nhập
 */
const fetchUserProfile = async (userId) => {
  if (!userId) return null;
  try {
    const user = await db.User.findByPk(userId, {
      attributes: ["id", "email"],
      include: [
        {
          model: db.UserProfile,
          as: "profile",
          attributes: ["full_name"],
        },
      ],
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.profile?.full_name || user.email?.split("@")[0] || "Quý khách",
    };
  } catch (err) {
    console.error("Lỗi lấy thông tin User Profile cho AI Chat:", err);
    return null;
  }
};

/**
 * Tra cứu 1-3 đơn hàng gần nhất của người dùng hoặc tra theo mã đơn cụ thể
 */
const fetchUserOrders = async (userId, queryText = "") => {
  const { Op } = db.Sequelize;
  try {
    // 1. Nếu tin nhắn có chứa mã đơn cụ thể dạng ORD-..., SO-..., hoặc UTE...
    const codeMatch = queryText.match(/(ORD-[A-Z0-9]+|SO-[A-Z0-9-]+|UTE[A-Z0-9]+)/i);
    const searchCode = codeMatch ? codeMatch[0].trim() : null;

    let whereClause = {};
    if (searchCode) {
      whereClause = {
        [Op.or]: [
          { checkout_code: { [Op.like]: `%${searchCode}%` } },
        ],
      };
      if (userId) {
        whereClause.user_id = userId;
      }
    } else if (userId) {
      whereClause = { user_id: userId };
    } else {
      return [];
    }

    const parentOrders = await db.ParentOrder.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
      limit: searchCode ? 1 : 3,
      include: [
        {
          model: db.ShopOrder,
          as: "shopOrders",
          include: [
            {
              model: db.Shop,
              as: "shop",
              attributes: ["id", "shop_name", "shop_logo"],
            },
            {
              model: db.Shipment,
              as: "shipment",
              attributes: ["id", "tracking_number", "status", "estimated_delivery_date"],
            },
            {
              model: db.OrderItem,
              as: "items",
              attributes: ["id", "product_name", "quantity", "unit_price", "size", "color"],
            },
          ],
        },
      ],
    });

    const formattedOrders = [];
    for (const po of parentOrders) {
      for (const so of po.shopOrders || []) {
        formattedOrders.push({
          id: so.id,
          parent_order_id: po.id,
          checkout_code: po.checkout_code,
          shop_order_code: so.shop_order_code,
          shop_name: so.shop?.shop_name || "Gian hàng MeeMart",
          shop_logo: so.shop?.shop_logo || null,
          total_amount: Number(so.final_amount || so.subtotal || 0),
          status: so.status,
          status_text: ORDER_STATUS_MAP[so.status] || so.status,
          payment_method: po.payment_method,
          payment_status: po.payment_status,
          tracking_number: so.shipment?.tracking_number || null,
          shipment_status: so.shipment?.status || null,
          shipment_status_text: SHIPMENT_STATUS_MAP[so.shipment?.status] || null,
          estimated_delivery_date: so.shipment?.estimated_delivery_date || null,
          items: (so.items || []).map((it) => ({
            name: it.product_name,
            quantity: it.quantity,
            price: Number(it.unit_price || 0),
            details: [it.color, it.size].filter(Boolean).join(" - "),
          })),
          created_at: so.created_at || po.created_at,
        });
      }
    }

    return formattedOrders.slice(0, 3);
  } catch (err) {
    console.error("Lỗi tra cứu đơn hàng cho AI Chat:", err);
    return [];
  }
};

/**
 * Tra cứu danh sách Voucher / Coupon đang hoạt động trên hệ thống
 */
const fetchActiveCoupons = async () => {
  const { Op } = db.Sequelize;
  try {
    const now = new Date();
    const coupons = await db.Coupon.findAll({
      where: {
        deleted_at: null,
        end_date: { [Op.gte]: now },
        start_date: { [Op.lte]: now },
        [Op.or]: [
          { usage_limit: null },
          db.Sequelize.literal("used_count < usage_limit"),
        ],
      },
      include: [
        {
          model: db.Shop,
          as: "shop",
          attributes: ["id", "shop_name"],
        },
      ],
      order: [["discount_value", "DESC"]],
      limit: 5,
    });

    return coupons.map((c) => {
      const isPercent = c.discount_type === "PERCENT";
      const desc = isPercent
        ? `Giảm ${c.discount_value}% (Tối đa ${Number(c.max_discount || 0).toLocaleString("vi-VN")}đ) cho đơn từ ${Number(c.min_order_amount || 0).toLocaleString("vi-VN")}đ`
        : `Giảm ${Number(c.discount_value).toLocaleString("vi-VN")}đ cho đơn từ ${Number(c.min_order_amount || 0).toLocaleString("vi-VN")}đ`;

      return {
        id: c.id,
        code: c.code,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        max_discount: c.max_discount ? Number(c.max_discount) : null,
        min_order_amount: Number(c.min_order_amount || 0),
        shop_name: c.shop?.shop_name || "Toàn sàn MeeMart",
        end_date: c.end_date,
        description: desc,
      };
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách coupon cho AI Chat:", err);
    return [];
  }
};

/**
 * Tìm kiếm sản phẩm RAG đa ngành hàng (Điện tử, Gia dụng, Thời trang, Mỹ phẩm...)
 */
const searchProductsRAG = async (userMessage) => {
  const { Op } = db.Sequelize;

  const words = userMessage
    .toLowerCase()
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  if (words.length === 0) return [];

  try {
    const products = await db.Product.findAll({
      where: {
        approval_status: "APPROVED",
        [Op.or]: [
          ...words.map((word) => ({ name: { [Op.like]: `%${word}%` } })),
          ...words.map((word) => ({ description: { [Op.like]: `%${word}%` } })),
        ],
      },
      include: [
        {
          model: db.ProductImage,
          as: "images",
          where: { is_primary: true },
          required: false,
          attributes: ["image_url"],
        },
        {
          model: db.Shop,
          as: "shop",
          attributes: ["id", "shop_name"],
        },
      ],
      order: [
        ["sold_count", "DESC"],
        ["id", "DESC"],
      ],
      limit: 6,
      attributes: ["id", "name", "price", "sale_price", "slug", "description", "sold_count"],
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      sale_price: p.sale_price ? Number(p.sale_price) : null,
      slug: p.slug,
      shop_name: p.shop?.shop_name || "MeeMart Store",
      image_url: p.images?.[0]?.image_url || null,
      sold_count: p.sold_count,
    }));
  } catch (err) {
    console.error("Lỗi tìm kiếm sản phẩm RAG:", err);
    return [];
  }
};

/**
 * Nhận diện ý định của câu hỏi người dùng
 */
const detectUserIntent = (message) => {
  const lower = message.toLowerCase();

  const isOrderQuery =
    lower.includes("đơn hàng") ||
    lower.includes("don hang") ||
    lower.includes("tra cứu đơn") ||
    lower.includes("kiểm tra đơn") ||
    lower.includes("đơn của tôi") ||
    lower.includes("mã đơn") ||
    lower.includes("vận đơn") ||
    lower.includes("ute") ||
    lower.includes("khi nào giao") ||
    lower.includes("bao giờ nhận") ||
    lower.includes("giao tới đâu") ||
    lower.includes("đang giao");

  const isVoucherQuery =
    lower.includes("mã giảm giá") ||
    lower.includes("ma giam gia") ||
    lower.includes("voucher") ||
    lower.includes("coupon") ||
    lower.includes("khuyến mãi") ||
    lower.includes("khuyen mai") ||
    lower.includes("ưu đãi") ||
    lower.includes("freeship") ||
    lower.includes("miễn phí ship") ||
    lower.includes("săn sale");

  const isShippingQuery =
    lower.includes("ship") ||
    lower.includes("vận chuyển") ||
    lower.includes("giao hàng") ||
    lower.includes("phí giao") ||
    lower.includes("tiền ship") ||
    lower.includes("giao nhanh");

  const isReturnWarrantyQuery =
    lower.includes("đổi trả") ||
    lower.includes("doi tra") ||
    lower.includes("trả hàng") ||
    lower.includes("hoàn tiền") ||
    lower.includes("bảo hành") ||
    lower.includes("bị lỗi") ||
    lower.includes("hỏng") ||
    lower.includes("khiếu nại");

  const isPaymentQuery =
    lower.includes("thanh toán") ||
    lower.includes("thanh toan") ||
    lower.includes("vnpay") ||
    lower.includes("cod") ||
    lower.includes("tiền mặt") ||
    lower.includes("chuyển khoản") ||
    lower.includes("visa");

  return {
    isOrderQuery,
    isVoucherQuery,
    isShippingQuery,
    isReturnWarrantyQuery,
    isPaymentQuery,
  };
};

/**
 * Xây dựng Ngữ cảnh & System Prompt cho AI Model
 */
const buildSystemPromptAndContext = async (userMessage, userId) => {
  const intent = detectUserIntent(userMessage);

  const [userInfo, orders, vouchers, products] = await Promise.all([
    fetchUserProfile(userId),
    intent.isOrderQuery ? fetchUserOrders(userId, userMessage) : Promise.resolve([]),
    intent.isVoucherQuery ? fetchActiveCoupons() : Promise.resolve([]),
    searchProductsRAG(userMessage),
  ]);

  // Ngữ cảnh người dùng
  let userContext = userInfo
    ? `- Khách hàng đã đăng nhập: ${userInfo.name} (ID: ${userInfo.id})`
    : `- Khách hàng là khách vãng lai (Chưa đăng nhập).`;

  // Ngữ cảnh đơn hàng
  let orderContext = "";
  if (intent.isOrderQuery) {
    if (!userId) {
      orderContext = `- Khách hàng chưa đăng nhập. Nhắc khách hàng vui lòng đăng nhập để hệ thống hiển thị đơn hàng của họ.`;
    } else if (orders.length > 0) {
      orderContext = orders
        .map(
          (o, idx) =>
            `${idx + 1}. Đơn #${o.checkout_code} (Gian hàng: ${o.shop_name}) - Trạng thái: ${o.status_text} | Tổng: ${o.total_amount.toLocaleString("vi-VN")}đ | Vận đơn: ${o.tracking_number || "Đang tạo mã"} (Tiến trình: ${o.shipment_status_text || "Chờ xử lý"})`
        )
        .join("\n");
    } else {
      orderContext = `- Không tìm thấy đơn hàng gần đây nào của khách hàng này.`;
    }
  }

  // Ngữ cảnh Voucher
  let voucherContext = "";
  if (intent.isVoucherQuery) {
    if (vouchers.length > 0) {
      voucherContext = vouchers
        .map((v) => `- Mã: **${v.code}** | ${v.description} | Áp dụng: ${v.shop_name}`)
        .join("\n");
    } else {
      voucherContext = `- Hiện tại chưa có mã giảm giá công khai nào đang mở.`;
    }
  }

  // Ngữ cảnh sản phẩm
  let productsContext = "";
  if (products.length > 0) {
    productsContext = products
      .map(
        (p) =>
          `- [${p.name}](http://localhost:5173/products/${p.slug}) | Giá: ${p.price.toLocaleString("vi-VN")}đ ${p.sale_price ? `(Sale: ${p.sale_price.toLocaleString("vi-VN")}đ)` : ""} | Shop: ${p.shop_name} | Đã bán: ${p.sold_count}`
      )
      .join("\n");
  }

  const systemPrompt = `Bạn là Trợ Lý AI Thông Minh của Sàn Thương Mại Điện Tử MeeMart (MeeMart AI Assistant).
MeeMart là sàn TMĐT đa ngành hàng uy tín hàng đầu: Điện tử & Công nghệ, Thiết bị gia dụng, Thời trang & Phụ kiện, Mỹ phẩm & Chăm sóc sức khỏe, Sách & Văn phòng phẩm, v.v.

THÔNG TIN NGƯỜI DÙNG:
${userContext}

CHÍNH SÁCH CHUẨN CỦA SÀN MEEMART:
1. Vận chuyển: Vận hành bởi đối tác vận chuyển chính thức UTE Express. Phí giao hàng tiêu chuẩn đồng giá 30.000đ toàn quốc. MỌI ĐƠN HÀNG CÓ GIÁ TRỊ TỪ 500.000đ TRỞ LÊN ĐƯỢC TỰ ĐỘNG MIỄN PHÍ VẬN CHUYỂN (FREESHIP).
2. Đổi trả & Hoàn tiền: Trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm bị lỗi do nhà sản xuất, bể vỡ khi vận chuyển hoặc sai mô tả. Khách có thể gửi yêu cầu Đổi trả/Hoàn tiền trực tiếp tại trang Chi tiết đơn hàng.
3. Bảo hành thiết bị: Hàng điện tử và gia dụng được bảo hành chính hãng theo thông tin tem bảo hành điện tử của gian hàng.
4. Phương thức thanh toán: Hỗ trợ tiền mặt khi nhận hàng (COD), cổng thanh toán trực tuyến VNPay (QR Pay / Thẻ ATM), và thẻ quốc tế Visa / Mastercard.
5. Liên hệ người bán: Khách có thể chuyển qua mục Danh sách chat để nhắn tin trực tiếp với chủ gian hàng (Shop) nếu cần hỗ trợ riêng.

DỮ LIỆU THỰC TẾ HỆ THỐNG TRÍCH XUẤT CHO CÂU HỎI:
${orderContext ? `\n[DỮ LIỆU ĐƠN HÀNG CỦA KHÁCH]:\n${orderContext}` : ""}
${voucherContext ? `\n[DANH SÁCH VOUCHER HOT CỦA SÀN]:\n${voucherContext}` : ""}
${productsContext ? `\n[DANH SÁCH SẢN PHẨM PHÙ HỢP TỪ KHO MEEMART]:\n${productsContext}` : ""}

QUY ĐỊNH TRẢ LỜI:
1. Xưng hô thân thiện, lịch sự, tôn trọng (Dạ em chào anh/chị...).
2. Nếu khách hỏi về đơn hàng: Dựa vào [DỮ LIỆU ĐƠN HÀNG CỦA KHÁCH] để cung cấp mã đơn, tiến trình vận chuyển UTE Express rõ ràng. Nếu chưa đăng nhập, khuyên khách đăng nhập để tra cứu.
3. Nếu khách hỏi về voucher/khuyến mãi: Giới thiệu các mã trong danh sách trên để khách sao chép sử dụng.
4. Nếu khách tìm sản phẩm: Giới thiệu sản phẩm phù hợp kèm link định dạng [Tên sản phẩm](http://localhost:5173/products/slug) chuẩn xác từ dữ liệu.
5. Không hạn chế câu trả lời ở ngành hàng thời trang hay nhắc đến chọn size/giặt ủi khi khách hỏi về đồ công nghệ, gia dụng hoặc mỹ phẩm.
6. Câu trả lời súc tích, định dạng markdown đẹp mắt, dùng icon trực quan.`;

  return {
    systemPrompt,
    intent,
    userInfo,
    orders,
    vouchers,
    products,
  };
};

/**
 * Gọi OpenAI API (gpt-4o-mini)
 */
const callOpenAIAPI = async (apiKey, systemPrompt, message) => {
  return await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.6,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      timeout: 30000,
    }
  );
};

/**
 * Gọi Google Gemini API (Ưu tiên gemini-3.5-flash-lite, dự phòng gemini-3.8-flash)
 */
const callGeminiAPI = async (apiKey, systemPrompt, message) => {
  const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        {
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt },
                { text: `Khách hàng nhắn: "${message}"` },
              ],
            },
          ],
        },
        {
          timeout: 30000,
        }
      );
      return response;
    } catch (err) {
      lastError = err;
      // Thử model tiếp theo nếu gặp lỗi
      continue;
    }
  }

  throw lastError;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fallback cục bộ khi không có kết nối internet hoặc API hết hạn mức
 */
const generateLocalFallbackResponse = async (message, context) => {
  const { intent, userInfo, orders, vouchers, products } = context;
  const customerName = userInfo?.name ? ` ${userInfo.name}` : "";

  // 1. Ý định Tra cứu Đơn hàng
  if (intent.isOrderQuery) {
    if (!userInfo) {
      return {
        reply: `Dạ chào bạn! Để tra cứu chính xác trạng thái đơn hàng và hành trình vận chuyển của bạn qua UTE Express, bạn vui lòng **Đăng nhập** tài khoản trước nhé ạ! Sau khi đăng nhập, em sẽ hiển thị ngay danh sách đơn hàng gần nhất của mình.`,
        orders: [],
        products: [],
        vouchers: [],
      };
    }

    if (orders.length > 0) {
      let reply = `Dạ chào anh/chị${customerName}! Em đã tra cứu thấy đơn hàng gần nhất của mình đây ạ:\n\n`;
      orders.forEach((o) => {
        reply += `📦 **Mã đơn: #${o.checkout_code}** (${o.shop_name})\n`;
        reply += `• Trạng thái đơn: **${o.status_text}**\n`;
        reply += `• Vận chuyển UTE Express: **${o.shipment_status_text || "Đang xử lý"}** (Mã vận đơn: \`${o.tracking_number || "Đang cập nhật"}\`)\n`;
        reply += `• Tổng thanh toán: **${o.total_amount.toLocaleString("vi-VN")}đ** (${o.payment_method})\n\n`;
      });
      reply += `Anh/chị có thể bấm vào thẻ đơn hàng bên dưới để xem chi tiết nhé!`;
      return {
        reply,
        orders,
        products: [],
        vouchers: [],
      };
    }

    return {
      reply: `Dạ anh/chị${customerName}, hiện tại hệ thống chưa ghi nhận đơn hàng nào gần đây trên tài khoản của mình. Anh/chị có muốn em hỗ trợ tìm kiếm sản phẩm nào không ạ?`,
      orders: [],
      products: [],
      vouchers: [],
    };
  }

  // 2. Ý định Mã giảm giá & Voucher
  if (intent.isVoucherQuery) {
    if (vouchers.length > 0) {
      let reply = `Dạ chào anh/chị${customerName}! MeeMart xin gửi anh/chị danh sách các **Mã giảm giá hot hôm nay** để mình áp dụng khi mua sắm nha:\n\n`;
      vouchers.forEach((v) => {
        reply += `🎟️ Mã: **${v.code}** — ${v.description} (${v.shop_name})\n`;
      });
      reply += `\nAnh/chị có thể bấm sao chép mã ở thẻ bên dưới để áp dụng tại bước thanh toán nhé ạ!`;
      return {
        reply,
        vouchers,
        orders: [],
        products: [],
      };
    }
    return {
      reply: `Dạ hiện tại sàn MeeMart đang miễn phí vận chuyển toàn quốc cho đơn hàng từ **500.000đ**. Các mã giảm giá đặc biệt sẽ sớm được mở thêm trong đợt sale tới nha!`,
      vouchers: [],
      orders: [],
      products: [],
    };
  }

  // 3. Ý định Vận chuyển / Phí ship
  if (intent.isShippingQuery) {
    return {
      reply: `Dạ chào bạn! Chính sách vận chuyển của sàn MeeMart rất ưu đãi và minh bạch ạ:
🚚 **Đơn vị vận chuyển:** Đối tác chính thức **UTE Express**, lấy hàng và giao tận tay nhanh chóng.
💵 **Phí vận chuyển tiêu chuẩn:** Đồng giá **30.000đ** cho mọi đơn hàng toàn quốc.
🎁 **Ưu đãi Freeship:** Đơn hàng có giá trị từ **500.000đ** trở lên sẽ được hệ thống tự động **MIỄN PHÍ VẬN CHUYỂN** 100%!`,
      orders: [],
      vouchers: [],
      products: [],
    };
  }

  // 4. Ý định Đổi trả & Bảo hành
  if (intent.isReturnWarrantyQuery) {
    return {
      reply: `Dạ chào bạn! Chính sách đổi trả & bảo hành của MeeMart nhằm bảo vệ quyền lợi tối đa cho khách hàng:
🔄 **Đổi trả hàng trong 7 ngày:** Áp dụng khi sản phẩm bị lỗi sản xuất, bể vỡ khi vận chuyển hoặc sai mẫu mô tả.
🛠️ **Bảo hành điện tử chính hãng:** Với hàng điện tử, công nghệ và gia dụng, sản phẩm được kích hoạt bảo hành điện tử theo số seri/phiếu bảo hành của từng gian hàng.
📋 **Cách thức đổi trả:** Bạn chỉ cần vào **Chi tiết đơn hàng** và bấm nút **"Yêu cầu Đổi trả/Hoàn tiền"**, hệ thống và shop sẽ xử lý trong vòng 24-48 giờ ạ!`,
      orders: [],
      vouchers: [],
      products: [],
    };
  }

  // 5. Ý định Thanh toán
  if (intent.isPaymentQuery) {
    return {
      reply: `Dạ sàn MeeMart hỗ trợ đa dạng các phương thức thanh toán an toàn, bảo mật cao:
1. **COD:** Thanh toán tiền mặt trực tiếp cho nhân viên giao hàng khi nhận sản phẩm.
2. **Cổng thanh toán VNPay:** Quét mã VNPAY-QR qua ứng dụng ngân hàng hoặc thẻ ATM nội địa.
3. **Thẻ quốc tế:** Hỗ trợ thanh toán nhanh qua thẻ Visa, Mastercard, JCB.`,
      orders: [],
      vouchers: [],
      products: [],
    };
  }

  // 6. Tìm kiếm sản phẩm
  if (products.length > 0) {
    let reply = `Dạ chào bạn! Em đã tìm thấy một số sản phẩm rất phù hợp với nhu cầu của mình trên sàn MeeMart đây ạ:\n\n`;
    products.forEach((p) => {
      reply += `- **[${p.name}](http://localhost:5173/products/${p.slug})** | Giá: **${p.price.toLocaleString("vi-VN")}đ** (${p.shop_name})\n`;
    });
    reply += `\nBạn có thể bấm vào thẻ sản phẩm bên dưới để xem hình ảnh và đặt hàng nhé!`;
    return {
      reply,
      products,
      orders: [],
      vouchers: [],
    };
  }

  // Mặc định
  return {
    reply: `Dạ xin chào anh/chị${customerName}! Em là **Trợ lý AI Thông Minh của MeeMart** 🤖.
Em có thể hỗ trợ anh/chị các nghiệp vụ mua sắm tiện ích sau:
• 📦 **Tra cứu đơn hàng & hành trình UTE Express** (Ví dụ: "Đơn hàng của tôi")
• 🎟️ **Săn mã giảm giá hot** (Ví dụ: "Mã giảm giá hôm nay")
• 🔍 **Tìm kiếm sản phẩm đa ngành hàng** (Điện tử, Gia dụng, Thời trang, Mỹ phẩm...)
• 🚚 **Chính sách giao hàng, đổi trả 7 ngày & thanh toán**

Anh/chị hãy chọn một gợi ý nhanh bên dưới hoặc nhập câu hỏi để em giải đáp ngay nhé!`,
    products: [],
    orders: [],
    vouchers: [],
    suggestions: [
      "📦 Tra cứu đơn hàng của tôi",
      "🎟️ Săn mã giảm giá hot",
      "🚚 Phí ship & thời gian giao",
      "🔄 Chính sách đổi trả & bảo hành",
      "💬 Chat với chủ Shop"
    ]
  };
};

/**
 * Xử lý chính ChatWithAI
 */
const chatWithAI = async (message, userId = null) => {
  const openAIKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const context = await buildSystemPromptAndContext(message, userId);
  const { systemPrompt, products, orders, vouchers } = context;
  const maxRetries = 2;

  // Gợi ý nhanh mặc định
  const suggestions = [
    "📦 Tra cứu đơn hàng của tôi",
    "🎟️ Săn mã giảm giá hot",
    "🚚 Phí ship & thời gian giao",
    "🔄 Chính sách đổi trả & bảo hành",
  ];

  // ƯU TIÊN 1: Dùng OpenAI nếu có API Key
  if (openAIKey && openAIKey.trim().startsWith("sk-")) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await callOpenAIAPI(openAIKey, systemPrompt, message);
        if (response.data?.choices?.[0]?.message?.content) {
          return {
            reply: response.data.choices[0].message.content,
            products,
            orders,
            vouchers,
            suggestions,
          };
        }
      } catch (error) {
        console.error(`[AI Chat] Lỗi OpenAI (Lần ${attempt + 1}):`, error.response?.data || error.message);
        if (error.response?.status === 429 && attempt < maxRetries) {
          await delay((attempt + 1) * 2000);
          continue;
        }
        break;
      }
    }
  }

  // ƯU TIÊN 2: Dùng Google Gemini 2.0 Flash
  if (geminiKey && geminiKey.trim()) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await callGeminiAPI(geminiKey, systemPrompt, message);
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return {
            reply: response.data.candidates[0].content.parts[0].text,
            products,
            orders,
            vouchers,
            suggestions,
          };
        }
      } catch (error) {
        console.error(`[AI Chat] Lỗi Gemini (Lần ${attempt + 1}):`, error.response?.data || error.message);
        if (error.response?.status === 429 && attempt < maxRetries) {
          await delay((attempt + 1) * 2000);
          continue;
        }
        break;
      }
    }
  }

  // ƯU TIÊN 3: Chạy Fallback thông minh nội bộ
  console.log("[AI Chat] Chạy bằng Local Fallback Engine.");
  const fallbackRes = await generateLocalFallbackResponse(message, context);
  return {
    ...fallbackRes,
    suggestions,
  };
};

export default {
  chatWithAI,
};
